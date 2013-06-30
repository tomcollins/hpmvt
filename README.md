hpmvt
=====

#Usage
node app.js --project=homepage

Options:
--port=5000
--http_proxy=www-cache.reith.bbc.co.uk
--http_proxy_port=80

Defaults:
port: 3000
http_proxy: null
http_proxy_port: null

node app.js --project=homepage --http_proxy=188.227.189.66 --http_proxy_port=80 --analyticsHost=localhost:3001

forever start app.js --project=homepage --host=host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com --port=3000 --http_proxy=188.227.189.66 --http_proxy_port=80 --analytics_host=ec2-54-216-199-221.eu-west-1.compute.amazonaws.com:4000
