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
