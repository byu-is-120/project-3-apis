#!/bin/bash

echo "Zipping Updater Function"

# Create a zip file excluding the other zip files
zip -rq ./dist/project-3-updator.zip . -x "*.zip" -x "dist/*"

echo "Zipped"
