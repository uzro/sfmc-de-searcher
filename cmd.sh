!#/bin/bash

# packaging src to tar.gz with version number
# get version number from manifest file 
version=$(grep '"version"' ./src/manifest.json | awk -F'"' '{print $4}')
echo "Packaging version $version"

# create dist directory if not exist
[ ! -d ./dist ] && mkdir -p ./dist

# create tar.gz
tar -czf ./dist/smfc-ds-$version.tar.gz ./src
