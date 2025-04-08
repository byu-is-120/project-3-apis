#!/bin/bash

echo "Uploading Updator Function"

aws lambda update-function-code \
	--function-name project-3-updater \
	--zip-file fileb://dist/project-3-updator.zip \
	--no-cli-pager # don't require the user to press enter to continue

echo "Uploaded"
