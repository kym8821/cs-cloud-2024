const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
const supplier = require('./app/controller/supplier.controller');
const app = express();
const mustacheExpress = require('mustache-express');
const favicon = require('serve-favicon');
const https = require('https');
// parse requests of content-type: application/json
app.use(bodyParser.json());
// parse requests of content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.options('*', cors());
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static('public'));
app.use(favicon(__dirname + '/public/img/favicon.ico'));

// 메타데이터 토큰을 가져오는 함수
let tokenData = undefined;
async function fetchToken() {
  if (tokenData) return tokenData;
  const response = await fetch('http://169.254.169.254/latest/api/token', {
    method: 'PUT',
    headers: {
      'X-aws-ec2-metadata-token-ttl-seconds': '21600',
    },
  });
  tokenData = await response.text();
  return tokenData;
}

// 주어진 메타데이터 경로에서 데이터를 가져오는 함수
let metaData = {};
async function fetchMetadata(path, token) {
  if (metaData[path]) return metaData[path];
  try {
    const response = await fetch(`http://169.254.169.254/latest/meta-data/${path}`, {
      headers: {
        'X-aws-ec2-metadata-token': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    metaData[path] = await response.text();
    return metaData[path];
  } catch (error) {
    console.error('Error fetching metadata:', error.message);
    throw error;
  }
}

let ipData = undefined;
function fetchIpInfo() {
  return new Promise((resolve, reject) => {
    if (ipData) {
      try {
        const loc = JSON.parse(ipData);
        const result = {
          ip: loc.ip,
          country: loc.country_name,
          region: loc.region,
          lat_long: `${loc.latitude}, ${loc.longitude}`,
          timezone: loc.timezone,
        };
        return resolve(result);
      } catch (error) {
        console.error('Invalid IP data, fetching new data...');
      }
    }

    const options = {
      path: '/json/',
      host: 'ipapi.co',
      port: 443,
      headers: { 'User-Agent': 'nodejs-ipapi-v1.02' },
    };

    https
      .get(options, (resp) => {
        let body = '';
        resp.on('data', (data) => {
          body += data;
        });

        resp.on('end', () => {
          try {
            ipData = body;
            const loc = JSON.parse(body);
            const result = {
              ip: loc.ip,
              country: loc.country_name,
              region: loc.region,
              lat_long: `${loc.latitude}, ${loc.longitude}`,
              timezone: loc.timezone,
            };
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// list all the suppliers
app.get('/', async (req, res) => {
  try {
    const token = await fetchToken(); // 토큰 가져옴
    // 각 메타데이터 항목에 대한 요청을 비동기적으로 처리
    const [instance_id, instance_type, avail_zone] = await Promise.all([
      fetchMetadata('instance-id', token),
      fetchMetadata('instance-type', token),
      fetchMetadata('placement/availability-zone', token),
    ]);

    const ipInfo = await fetchIpInfo();

    // 모든 메타데이터를 받은 후 응답을 렌더링
    res.render('home', {
      public_ip: ipInfo.ip,
      instance_id: instance_id,
      instance_type: instance_type,
      avail_zone: avail_zone,
      geo_country_name: ipInfo.country,
      geo_region_name: ipInfo.region,
      geo_lat_long: ipInfo.lat_long,
      geo_timezone: ipInfo.timezone,
    });
  } catch (error) {
    console.error('Error fetching EC2 metadata:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/health', (req, res) => {
  res.render('health', {});
});
app.get('/suppliers/', supplier.findAll);
// show the add suppler form
app.get('/supplier-add', (req, res) => {
  res.render('supplier-add', {});
});
// receive the add supplier POST
app.post('/supplier-add', supplier.create);
// show the update form
app.get('/supplier-update/:id', supplier.findOne);
// receive the update POST
app.post('/supplier-update', supplier.update);
// receive the POST to delete a supplier
app.post('/supplier-remove/:id', supplier.remove);
// handle 404
app.use(function (req, res, next) {
  res.status(404).render('404', {});
});

// set port, listen for requests
const app_port = process.env.APP_PORT || 80;
app.listen(app_port, () => {
  console.log(`Server is running on port ${app_port}.`);
});
