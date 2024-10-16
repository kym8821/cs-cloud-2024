#!/bin/bash -xe

apt update -y
apt install nodejs unzip wget npm mysql-client awscli tree nmap -y
cd /home/ubuntu
git clone https://github.com/ddps-lab/cs-cloud-2024.git
cd /home/ubuntu/cs-cloud-2024/
chown ubuntu -R monolithic_code/
cd monolithic_code
npm install

# DB setup
#######################################
# must modify!!!
export DB_EP=!!!Must modify!!!
export DB_MASTER_NAME="!!!Must modify!!!"
export DB_PASSWD="!!!Must modify!!!"
#######################################
echo "export DB_EP=${DB_EP}" >> /home/ubuntu/.bashrc
echo "export DB_MASTER_NAME=${DB_MASTER_NAME}" >> /home/ubuntu/.bashrc
echo "export DB_PASSWD=${DB_PASSWD}" >> /home/ubuntu/.bashrc
mysql -u ${DB_MASTER_NAME} -p${DB_PASSWD} -h ${DB_EP} -P 3306 -e "CREATE USER 'nodeapp' IDENTIFIED WITH mysql_native_password BY 'coffee'";
mysql -u ${DB_MASTER_NAME} -p${DB_PASSWD} -h ${DB_EP} -P 3306 -e "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER ON *.* TO 'nodeapp'@'%' WITH GRANT OPTION;"
mysql -u ${DB_MASTER_NAME} -p${DB_PASSWD} -h ${DB_EP} -P 3306 -e "CREATE DATABASE COFFEE;"
mysql -u ${DB_MASTER_NAME} -p${DB_PASSWD} -h ${DB_EP} -P 3306 -e "USE COFFEE; CREATE TABLE suppliers(id INT NOT NULL AUTO_INCREMENT,name VARCHAR(255) NOT NULL,address VARCHAR(255) NOT NULL,city VARCHAR(255) NOT NULL,state VARCHAR(255) NOT NULL,email VARCHAR(255) NOT NULL,phone VARCHAR(100) NOT NULL,PRIMARY KEY ( id ));"

# sed the config file
sed -i "s|REPLACE-DB-HOST|${DB_EP}|g" /home/ubuntu/cs-cloud-2024/monolithic_code/app/config/config.js
sleep 2

#start the app
node index.js &

# ensure app starts at boot for all lab sessions
cat <<EOF > /etc/rc.local
#!/bin/bash
cd /home/ubuntu/cs-cloud-2024/monolithic_code/
sudo node index.js
EOF
chmod +x /etc/rc.local