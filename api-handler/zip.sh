#!/bin/bash

echo "Zipping $API_FOLDER"

mv ./index.js ./tmp-index.js

sed "s/Key: \".*\",/Key: \"data\/${API_FOLDER}\/data.json\",/g" ./tmp-index.js >./index.js

zip -rq dist-${API_FOLDER}.zip . -x "*.zip"

mv ./tmp-index.js ./index.js
