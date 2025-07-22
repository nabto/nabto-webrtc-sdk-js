# Welcome to the react native demo of Nabto WebRTC Signaling

Intro:

This showcases a react native demo for android and ios.

## Get started
Prerequisites:
* Install bun from [bun.sh]()
* Install pnpm


### Install dependencies

Note that there is currently a "bug" where pnpm install must be run first. So you should run both of the below commands.

in the root folder run
```
pnpm install
pnpm run build
```

in this folder run:
```
bun install
```

### Start android app

```
bun run android
```

### Start ios

```
bun run ios
```

### Build an android release apk:

```
npx expo eject
cd android && ./gradlew assembleRelease
```

### Speed up native iOS build time

The native iOS build is very slow (Android might be as well). [This guide](https://reactnative.dev/docs/build-speed) describes how to speed it up using `ccache`. In practice, build time reduction from several minutes to a few seconds is observed. The procedure boils down to the following:

Install `ccache`:

```
brew install ccache
```

Enable `ccache` support in the build - either edit `ios/Podfile.properties.json` or add a local version, `ios/Podfile.properties.local.json`:

```
{
  "apple.ccacheEnabled": "true"
}
```

Then do a clean build and observe faster subsequent builds.
