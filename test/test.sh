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

# Maximum number of retries
MAX_RETRIES=5
RETRY_COUNT=0

# FaaS base URL
BASE_URL="http://localhost:9000"

# Function to check readiness
check_readiness() {
	curl -s -o /dev/null -w "%{http_code}" $BASE_URL/readiness
}

# Get the prefix of a deployment
get_prefix() {
	metacall-deploy --dev --inspect Raw | jq -r ".[] | select(.suffix == \"$1\") | .prefix"
}

# Deploy only if we are not testing startup deployments, otherwise the deployments have been loaded already
deploy_if_not_testing() {
	[[ "${TEST_FAAS_STARTUP_DEPLOY}" != "true" ]] && metacall-deploy --dev
}

# Wait for the FaaS to be ready
wait_for_readiness() {
	while [[ $(check_readiness) != "200" ]]; do
		if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
			echo "Readiness check failed after $MAX_RETRIES retries."
			exit 1
		fi
		RETRY_COUNT=$((RETRY_COUNT + 1))
		sleep 1
	done
	echo "FaaS ready, starting tests."
}

# Run tests for an application
run_tests() {
	local app=$1
	local test_func=$2

	pushd data/$app
	deploy_if_not_testing
	prefix=$(get_prefix $app)
	url=$BASE_URL/$prefix/$app/v1/call
	$test_func $url
	popd

	# Test inspect functionality
	echo "Testing inspect functionality."
	inspect_response=$(curl -s $BASE_URL/api/inspect)

	# Verify inspection
	if [[ $inspect_response != *"$prefix"* || $inspect_response != *"packages"* ]]; then
		echo "Inspection test failed."
		exit 1
	fi

	echo "Inspection test passed."

	# Test delete functionality if testing startup deployments
	if [[ "${TEST_FAAS_STARTUP_DEPLOY}" == "true" ]]; then
		echo "Testing delete functionality."
		delete_project $app $prefix
		echo "Deletion test passed."
	fi
}

# Delete a deployed project
delete_project() {
	local app=$1
	local prefix=$2

	curl -X POST -H "Content-Type: application/json" -d '{"suffix":"'"$app"'","prefix":"'"$prefix"'","version":"v1"}' $BASE_URL/api/deploy/delete

	# Verify deletion
	if [[ "$app" == "python-dependency-app" ]]; then
		if [[ $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/$prefix/$app/v1/call/fetchJoke) != "404" ]]; then
			echo "Deletion test failed."
			exit 1
		fi
	else
		if [[ $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/$prefix/$app/v1/call/number) != "404" ]]; then
			echo "Deletion test failed."
			exit 1
		fi
	fi
}

# Test function for python-base-app
test_python_base_app() {
	local url=$1
	[[ $(curl -s $url/number) = 100 ]] || exit 1
	[[ $(curl -s $url/text) = '"asd"' ]] || exit 1
}

# Test function for python-dependency-app
test_python_dependency_app() {
	local url=$1
	[[ $(curl -s $url/fetchJoke) == *"setup"* && $(curl -s $url/fetchJoke) == *"punchline"* ]] || exit 1
}

# Test function for nodejs-base-app
test_nodejs_app() {
	local url=$1
	[[ $(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["madam"]}' $url/isPalindrome) == "true" ]] || exit 1
	[[ $(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["world"]}' $url/isPalindrome) == "false" ]] || exit 1
}

# Test function for nodejs-dependency-app
test_nodejs_dependency_app() {
	local url=$1
	local signin_response
	signin_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"user":"viferga","password":"123"}' $url/signin)

	local token
	token=$(echo $signin_response | sed 's/^"\(.*\)"$/\1/')
	[[ -n "$token" ]] || {
		echo "Failed to extract token"
		exit 1
	}

	[[ $(curl -s -X POST -H "Content-Type: application/json" -d '{"token":"'"$token"'","args":{"str":"hello"}}' $url/reverse) == '"olleh"' ]] || exit 1
	[[ $(curl -s -X POST -H "Content-Type: application/json" -d '{"token":"'"$token"'","args":{"a":1,"b":2}}' $url/sum) == 3 ]] || exit 1
}

# Main execution starts here
# Wait for FaaS readiness
wait_for_readiness

# Run tests for different applications
run_tests "nodejs-base-app" test_nodejs_app
run_tests "nodejs-dependency-app" test_nodejs_dependency_app
run_tests "python-base-app" test_python_base_app

# Run dependency app tests if specified
if [[ "${TEST_FAAS_DEPENDENCY_DEPLOY}" == "true" ]]; then
	run_tests "python-dependency-app" test_python_dependency_app
fi

echo "Integration tests passed without errors."
