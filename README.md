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

node app.js --project=homepage --http_proxy=188.227.189.66 --http_proxy_port=80 --analyticsHost=localhost:3001

forever start app.js --project=homepage --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --port=3000 --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000

forever start app.js --project=homepage --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=news --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3001 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com



forever start app.js --project=homepage --http_proxy=87.236.208.195 --http_proxy_port=1080 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=news --http_proxy=87.236.208.19 --http_proxy_port=1080 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3001 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com

forever start app.js --project=homepage --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --analytics_port=4000 --port=3000 --host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com
