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

FROM node:20-bookworm-slim AS base

# Image descriptor
LABEL copyright.name="Vicente Eduardo Ferrer Garcia" \
	copyright.address="vic798@gmail.com" \
	maintainer.name="Vicente Eduardo Ferrer Garcia" \
	maintainer.address="vic798@gmail.com" \
	vendor="MetaCall Inc." \
	version="0.1"

WORKDIR /metacall

FROM base AS deps

COPY . .

RUN npm install \
	&& npm run build

FROM base as faas

RUN apt-get update \
	&& apt-get install wget ca-certificates -y --no-install-recommends \
	&& wget -O - https://raw.githubusercontent.com/metacall/install/master/install.sh | sh

COPY --from=deps /metacall/node_modules node_modules
COPY --from=deps /metacall/dist dist

EXPOSE 9000

CMD ["node", "dist/index.js"]

# TODO: testing
