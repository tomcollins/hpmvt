hpmvt
=====

#Usage
node app.js --project=homepage

Options:
--port=5000
--http_proxy=www-cache.reith.bbc.co.uk
--http_proxy_port=80
--analytics_host=localhost
--analytics_port=4000

Defaults:
port: 3000
http_proxy: null
http_proxy_port: null




app.js --project=homepage --http_proxy=http://188.227.189.66:80 --analytics_host=54.217.254.32 --analytics_port=4000

app.js --project=news --port=3001 --analytics_host=54.217.254.32 --analytics_port=4000

// api
forever start app.js

// mvtcookie
forever start app.js --redirect_host=54.217.254.32:3000 --api_base=54.217.254.32:4000


app.js --project=homepage --http_proxy=188.227.189.66:80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000



app.js --project=homepage --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --port=3000 --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000

app.js --project=news --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3001 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

/usr/bin/nodejs app.js




node app.js --project=news --http_proxy=www-cache.reith.bbc.co.uk --http_proxy_port=80 --analyticsHost=localhost:400

node app.js --project=homepage --http_proxy=188.227.189.66 --http_proxy_port=80 --analyticsHost=localhost:3001

forever start app.js --project=homepage --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --port=3000 --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000

forever start app.js --project=homepage --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=news --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3001 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com



forever start app.js --project=homepage --http_proxy=87.236.208.195 --http_proxy_port=1080 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=news --http_proxy=87.236.208.19 --http_proxy_port=1080 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3001 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=homepage --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com
