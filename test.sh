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

# Integration tests, first docker compose up runs the normal test.
# The second one runs the test without deleting the FaaS container,
# and the environment varialbe TEST_FAAS_STARTUP_DEPLOY forces the
# test to avoid deploying again all the deployments. By this we are
# testing if the startup initialization works because the deployments
# are persisted from the previous run

docker compose build
NODE_ENVIRONMENT=deployment TEST_FAAS_DEPENDENCY_DEPLOY=true docker compose up --exit-code-from test
TEST_FAAS_STARTUP_DEPLOY=true TEST_FAAS_DEPENDENCY_DEPLOY=true NODE_ENVIRONMENT=deployment docker compose up --exit-code-from test
docker compose down
