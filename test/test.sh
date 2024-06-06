#!/bin/bash

#
#	MetaCall FaaS Script by Parra Studios
#	Reimplementation of MetaCall FaaS platform written in TypeScript.
#
#	Copyright (C) 2016 - 2024 Vicente Eduardo Ferrer Garcia <vic798@gmail.com>
#
#	Licensed under the Apache License, Version 2.0 (the "License");
#	you may not use this file except in compliance with the License.
#	You may obtain a copy of the License at
#
#		http://www.apache.org/licenses/LICENSE-2.0
#
#	Unless required by applicable law or agreed to in writing, software
#	distributed under the License is distributed on an "AS IS" BASIS,
#	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#	See the License for the specific language governing permissions and
#	limitations under the License.
#

set -exuo pipefail

# FaaS base URL
BASE_URL="http://localhost:9000"

# Get the prefix of a deployment
function getPrefix() {
	prefix=$(metacall-deploy --dev --inspect Raw | jq -r ".[] | select(.suffix == \"$1\") | .prefix")
	echo $prefix
}

# Deploy only if we are not testing startup deployments, otherwise the deployments have been loaded already
function deploy() {
	if [[ "${TEST_FAAS_STARTUP_DEPLOY}" != "true" ]]; then
		metacall-deploy --dev
	fi
}

# Wait for the FaaS to be ready
while [[ ! $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/readiness) = "200" ]]; do
	sleep 1
done

echo "FaaS ready, starting tests."

# Test deploy (Python) without dependencies
app="python-base-app"
pushd data/$app
	deploy
	prefix=$(getPrefix $app)
	url=$BASE_URL/$prefix/$app/v1/call
	[[ $(curl -s $url/number) = 100 ]] || exit 1
	[[ $(curl -s $url/text) = '"asd"' ]] || exit 1
popd


# Test inspect
echo "Testing inspect functionality."

# Inspect the deployed projects
inspect_response=$(curl -s $BASE_URL/api/inspect)

# Verify inspection
if [[ $inspect_response != *"$prefix"* ]] || [[ $inspect_response != *"packages"* ]]; then
    echo "Inspection test failed."
    exit 1
fi

echo "Inspect test passed."

# Test delete
echo "Testing delete functionality."

# Delete the deployed project
curl -X POST -H "Content-Type: application/json" -d '{"suffix":"python-base-app","prefix":"'$prefix'","version":"v1"}' $BASE_URL/api/deploy/delete

# Verify deletion
if [[ $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/$prefix/$app/v1/call/number) != "404" ]]; then
    echo "Deletion test failed."
    exit 1
fi

echo "Deletion test passed."