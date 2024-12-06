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

set -exuo pipefail

# Maximum number of retries
MAX_RETRIES=5
RETRY_COUNT=0

# FaaS base URL
BASE_URL="http://localhost:9000"

# Function to check readiness
function check_readiness() {
	local status_code
	status_code=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/readiness)
	echo "$status_code"
}

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
while [[ $(check_readiness) != "200" ]]; do
	if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
		echo "Readiness check failed after $MAX_RETRIES retries."
		exit 1
	fi
	RETRY_COUNT=$((RETRY_COUNT + 1))
	sleep 1
done

echo "FaaS ready, starting tests."

# Function to run tests
function run_tests() {
	local app=$1
	local test_func=$2

	pushd data/$app
	deploy
	prefix=$(getPrefix $app)
	url=$BASE_URL/$prefix/$app/v1/call
	$test_func $url
	popd

	# Test inspect
	echo "Testing inspect functionality."

	# Inspect the deployed projects
	inspect_response=$(curl -s $BASE_URL/api/inspect)

	# Verify inspection
	if [[ $inspect_response != *"$prefix"* ]]; then
		echo "Inspection test failed."
		exit 1
	fi

	# Verify packages are included in the response
	if [[ $inspect_response != *"packages"* ]]; then
		echo "packages not found in inspection response."
		exit 1
	fi

	echo "Inspection test passed."

	# Call delete functionality
	if [[ "${TEST_FAAS_STARTUP_DEPLOY}" == "true" ]]; then
		delete_functionality $app $prefix
	fi
}

# Function to test delete functionality
function delete_functionality() {
	local app=$1
	local prefix=$2

	echo "Testing delete functionality."

	# Delete the deployed project
	curl -X POST -H "Content-Type: application/json" -d '{"suffix":"'"$app"'","prefix":"'"$prefix"'","version":"v1"}' $BASE_URL/api/deploy/delete

	# Verify deletion
	case "$app" in
	"python-dependency-app")
		endpoint="fetchJoke"
		;;
	"python-base-app")
		endpoint="number"
		;;
	"nodejs-base-app")
		endpoint="isPalindrome"
		;;
	"nodejs-dependency-app")
		endpoint="signin"
		;;
	*)
		echo "Unknown application: $app"
		exit 1
		;;
	esac

	if [[ $(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/$prefix/$app/v1/call/$endpoint) != "404" ]]; then
		echo "Deletion test failed."
		exit 1
	fi

	echo "Deletion test passed."
}

# Test function for python-base-app
function test_python_base_app() {
	local url=$1
	[[ $(curl -s $url/number) = 100 ]] || exit 1
	[[ $(curl -s $url/text) = '"asd"' ]] || exit 1
}

# Test function for python-dependency-app
function test_python_dependency_app() {
	local url=$1
	[[ $(curl -s $url/fetchJoke) == *"setup"* && $(curl -s $url/fetchJoke) == *"punchline"* ]] || exit 1
}

# Test function for nodejs-base-app
function test_nodejs_app() {
	local url=$1

	local response1
	response1=$(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["madam"]}' $url/isPalindrome)
	[[ $response1 == "true" ]] || exit 1

	local response2
	response2=$(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["world"]}' $url/isPalindrome)
	[[ $response2 == "false" ]] || exit 1
}

# Test function for nodejs-dependency-app
function test_nodejs_dependency_app() {
	local url=$1

	local signin_response
	signin_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"user":"viferga","password":"123"}' $url/signin)

	local token
	token=$(echo $signin_response | sed 's/^"\(.*\)"$/\1/')

	if [[ -z "$token" ]]; then
		echo "Failed to extract token"
		exit 1
	fi

	local reverse_response
	reverse_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"token":"'"$token"'","args":{"str":"hello"}}' $url/reverse)
	[[ $reverse_response = '"olleh"' ]] || exit 1

	local sum_response
	sum_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"token":"'"$token"'","args":{"a":1,"b":2}}' $url/sum)
	[[ $sum_response = 3 ]] || exit 1
}

echo "Integration tests for deploy with repo url starts"
function test_deploy_from_repo() {
	local repo_url=$1
	local app_name=$2
	local test_func=$3

	echo "Testing Deployment from repository: $repo_url"

	yes | NODE_ENV="testing" METACALL_DEPLOY_INTERACTIVE="0" metacall-deploy --addrepo $repo_url --dev &
	DEPLOY_PID=$!

	sleep 10
	kill $DEPLOY_PID 2>/dev/null

	# Get the prefix of the deployment
	prefix=$(getPrefix $app_name)
	url=$BASE_URL/$prefix/$app_name/v1/call

	#Run the test function
	$test_func $url

	#Verify the deployment
	inspect_response=$(curl -s $BASE_URL/api/inspect)
	if [[$inspect_response != *"$prefix"*]]; then
		echo "Inspection test failed for $app_name."
		exit 1
	fi
	echo "Deployment test passed for $app_name."
}

function test_nodejs-parameter-example() {
	local url=$1

	local response1
	response1=$(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["madam"]}' $url/isPalindrome)
	[[ $response1 == "true" ]] || exit 1

	local response2
	response2=$(curl -s -X POST -H "Content-Type: application/json" -d '{"params":["world"]}' $url/isPalindrome)
	[[ $response2 == "false" ]] || exit 1
	echo "Node.js base app test passed."
}

function test_python_time_app() {
	local url=$1
	local response

	echo "Testing Python Time App at $url"

	# Test index endpoint
	response=$(curl -s $url/index)
	if [[ $response != *"<html"* ]] || [[ $response != *"Python Time App"* ]]; then
		echo "Index test failed for Python Time App"
		exit 1
	fi

	# Test time endpoint
	response=$(curl -s $url/time)
	if [[ ! $response =~ [0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2} ]]; then
		echo "Time test failed for Python Time App"
		exit 1
	fi

	echo "Python Time App tests passed"

}

# Test function for python-dependency-metacall
function test_python_dependency_metacall() {
	local url=$1
	local response=$(curl -s $url/fetch_joke)

	if [[ $response == *"setup"* && $response == *"punchline"* ]]; then
		echo "fetch_joke test passed: Joke structure is correct"
	elif [[ $response == *"Error fetching joke"* ]]; then
		echo "fetch_joke test passed: Error handling works"
	else
		echo "fetch_joke test failed: Unexpected response"
		exit 1
	fi
}

function test_nodejs_dependency_app() {
	local url=$1

	echo "Testing Node.js Dependency App at $url"

	# Test signin function
	local signin_response=$(curl -s -X POST "$url/signin" -H "Content-Type: application/json" -d '{"user":"viferga","password":"123"}')
	local token=$(echo $signin_response | sed 's/^"\(.*\)"$/\1/')

	if [ -z "$token" ]; then
		echo "Signin test failed for Node.js Dependency App"
		exit 1
	fi

	# Test reverse function with middleware
	local reverse_response=$(curl -s -X POST "$url/reverse" -H "Content-Type: application/json" -d "{\"token\":\"$token\",\"args\":{\"str\":\"hello\"}}")
	if [ "$reverse_response" != '"olleh"' ]; then
		echo "Reverse function test failed for Node.js Dependency App"
		exit 1
	fi

	# Test sum function with middleware
	local sum_response=$(curl -s -X POST "$url/sum" -H "Content-Type: application/json" -d "{\"token\":\"$token\",\"args\":{\"a\":5,\"b\":3}}")
	if [ "$sum_response" != "8" ]; then
		echo "Sum function test failed for Node.js Dependency App"
		exit 1
	fi

	echo "Node.js Dependency App tests passed"
}

# without Dependencies

# Test NodeJs app
test_deploy_from_repo "https://github.com/HeeManSu/nodejs-parameter-example" "nodejs-parameter-example" test_nodejs-parameter-example
# Test Python app
test_deploy_from_repo "https://github.com/HeeManSu/metacall-python-example" "metacall-python-example" test_python_time_app

# With Dependencies

# Test Python app
test_deploy_from_repo "https://github.com/HeeManSu/python-dependency-metacall" "python-dependency-metacall" test_python_dependency_metacall
#Test NodeJs app
test_deploy_from_repo "https://github.com/HeeManSu/auth-middleware-metacall" "auth-middleware-metacall" test_nodejs_dependency_app

echo "Repository deployment tests completed."

# Simultaneous deployment tests
function test_simultaneous_deploy() {
	echo "Testing simultaneous deployments..."
	pids=()

	# Run all tests simultaneously in background
	run_tests "nodejs-base-app" test_nodejs_app &
	pids+=($!)

	run_tests "python-base-app" test_python_base_app &
	pids+=($!)

	run_tests "python-dependency-app" test_python_dependency_app &
	pids+=($!)

	run_tests "nodejs-dependency-app" test_nodejs_dependency_app &
	pids+=($!)

	for pid in "${pids[@]}"; do
		if ! wait $pid; then
			echo "Simultaneous deployment test failed - Test failed"
			return 1
			exit 1
		fi
	done

	echo "Simultaneous deployment test passed - All tests passed"
	return 0
}

echo "Testing simultaneous deployments..."
test_simultaneous_deploy
