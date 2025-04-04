#!/bin/bash

echo "Uploading $API_FOLDER"

aws lambda update-function-code \
	--function-name $API_FOLDER \
	--zip-file fileb://./dist-$API_FOLDER.zip \
	--no-cli-pager
