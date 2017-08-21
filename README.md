# loader

*


* notes
  * [make png image transparent](https://stackoverflow.com/questions/12945763/how-to-convert-the-background-to-transparent)

ssh -i ~/.ssh/aws-635795671316.pem ec2-user@[public ip]
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo -i
curl -L https://github.com/docker/compose/releases/download/1.15.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
exit
exit
scp -i ~/.ssh/aws-635795671316.pem docker-compose-prod.yml ec2-user@[public ip]:~/docker-compose.yml

docker exec -it 8129711e88d7 /bin/bash
