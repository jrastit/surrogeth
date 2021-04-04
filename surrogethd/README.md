# surrogethd

surrogethd is a piece of code anyone can run to act as a surrogeth node offering meta-transaction service. We've designed the code to be simple enough for anyone with access to a command line to run with minimal configuration.

## Setup

First, clone the repo and `cd` into this directory:

```
$ git clone git@github.com:jrastit/surrogeth.git
$ cd surrogeth/surrogethd
```

### Config

In the config directory, copy config.example.yaml to local-dev.yaml and modify it as you need

### privateKey

Create file for storing private key as decribed in your config, it can be relative path or absolute path
the format is ["0x..."]

### Running for Production Deployment

First, make sure you've set up a proper `local-dev.yaml` file.

The relayer is deployed as a single Docker container. To start, check out the [Docker docs](https://docs.docker.com) and install Docker.

Once Docker's been installed, `cd` to `surrogethd` wherever you've cloned this repository and build the Dockerfile:

```
$ docker build .
...
Successfully built $CONTAINER_ID
```

Now, run the container by its container ID, specifying the previously created env file and the port from which you want this service to be accessed:

```
$ docker run --env-file .env -p $YOUR_PORT_HERE:8080 $YOUR_CONTAINER_ID_HERE
```

To check that the service is running as expected, try hitting it:

```
$ curl localhost:$YOUR_PORT_HERE/address
{"address":"0x.........."}
```

### Running for Local Development

First, make sure you've set up a proper `local-dev.yaml` file.

Now, install nodejs (> v10.0.0) and npm however you prefer.

Next, install all dependencies:

```
$ npm i
```

Then, run the server:

```
$ npm start

...

Listening on port 8080
```

Finally, check that the server is running as expected:

```
$ curl localhost:8080/address
{"ganache":"0x.........."}
```

### Testing

surrogethd's tests are written using [jest](https://jestjs.io/en/). Run them with npm:

```
npm run test
```
