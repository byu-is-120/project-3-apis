#!/bin/bash

if [[ -z "$API_FOLDER" ]]; then
	echo "Error: API_FOLDER is not set."
	exit 1
fi

echo "Zipping $API_FOLDER"

# move the index.js file to a temporary file. This makes sure the source code isn't modified or lost
cp ./index.js ./tmp-index.js

# Update the index.js file to point to the correct folder in S3
sed -i "s/const FILE_KEY = \".*\";/const FILE_KEY = \"data\/${API_FOLDER}\/data.json\";/g" ./index.js

# Create a zip file excluding the other zip files
zip -rq ./dist/${API_FOLDER}.zip . -x "*.zip" -x "dist/*"

# move the index.js file back to the original path
mv ./tmp-index.js ./index.js
