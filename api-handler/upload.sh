#!/bin/bash

if [[ -z "$API_FOLDER" ]]; then
	echo "Error: API_FOLDER is not set."
	exit 1
fi

echo "Uploading $API_FOLDER"

aws lambda update-function-code \
	--function-name $API_FOLDER \
	--zip-file fileb://./dist/$API_FOLDER.zip \
	--no-cli-pager # don't require the user to press enter to continue
