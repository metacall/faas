# MetaCall FaaS

Reimplementation of MetaCall FaaS platform written in TypeScript.

### Development:
```sh
npm install
npm start
```

### About Project :

Metacall organization has its own cloud platform known as [Metacall FaaS](https://metacall.io/), a production-ready and high-performance FaaS/Cloud platform where you can deploy services, web apps, and lambdas in seconds. However, the ```Real``` version of Metacall FaaS is commercialized and requires a plan to deploy your polyglot applications, which can be found [Here](https://metacall.io/pricing/).

When referring to the ```Real``` version of Metacall FaaS, it should be noted that this refers to the commercialized FaaS cloud service, whereas ```Local``` refers to the mimic version.

Soon, we realized that many contributors joining the community needed an paid account on the ```Real FaaS``` for testing their polyglot applications. To remove this barrier, we proposed a project that would mimic the ```Real FaaS```.

With this project, developers can now use it to deploy and test their polyglot applications (built using [Metacall Core](https://github.com/metacall/core)), web apps, and lambdas. The process is simple:

- Step 1 : Spin up the "Local FaaS" by running the following command:

```sh
cd faas
npm start
```

- Step 2 : Install the [metacall-deploy](https://www.npmjs.com/package/@metacall/deploy) NPM package, and wire the ```--dev``` flag with the ```metacall-deploy``` command in your application directory using the following command:

```sh
cd move-to-application-directory
metacall-deploy --dev
```

### Things that need to be implemented:

- In order to mimic the "Real FaaS", we need to create all the API endpoints that the "Real FaaS" supports, which can be found listed [Here](https://github.com/metacall/protocol/blob/master/src/protocol.ts).

### Important Note

- This project is still under development and there is one extra thing you need to install before running this project and its [Metacall Core](https://github.com/metacall/core/blob/develop/docs/README.md#41-installation).

- This project is developed using [Metacall Core] itself in order to provide polyglot support, we are using its [Node Port](https://github.com/metacall/core/tree/develop/source/ports/node_port) of this library to use all the functions and methods ```Metcall Core C API``` provides.

- Also, [Here](https://github.com/metacall/faas/blob/master/types/metacall.d.ts) are all the functions of ```Metacall Core``` we are using.

