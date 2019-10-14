# Twig - Smart Flowerpot

> This is bluetooth-enabled mobile app with two main functions. The first function is to display environmental data from a suite of bluetooth-enabled sensors. The second function is to write brightness data to a bluetooth-enabled LED lamp.

# Technologies used for this project

* [Ionic - Hybrid Mobile App Framework](https://ionicframework.com/docs/intro)

# Dependency Installation

```bash
# Make sure you have Node and npm installed (https://nodejs.org/en/)
$ npm install -g ionic # Install the Ionic CLI and toolchain
# Navigate into the root directory for this project
$ npm i # install all node modules for this project
```

# Running the app in development mode

```bash
# Make sure you receive config.json from your admin
# Move config.json into this location: src/app/home/config.json
# You need the config.json file in the right location for this app to work
$ ionic serve
```

# Building the app for deployment

> I ran into some incompatibility issues with the latest version of Xcode and the Cordova framework. I resolved these issues by forcing the Cordova build system to use the legacy Xcode build system instead of the newest one. This issue is not unique to this app, and can easily be found in the Cordova forums.

```bash
$ sudo ionic cordova build ios --prod --release  -- --buildFlag="-UseModernBuildSystem=0"
# Code signing and certificates can be handled in Xcode
```

# Reference Code

> Included below is some reference code from the hardware engineer working on this project. This code was helpful in understanding how to parse the raw data coming in from the bluetooth-enabled sensors.

```java
// Reference code from the hardware engineer
// It was necessary to manually parse some of the binary data
if (dht.getStatus() == 0) { 
  THING t;  
  t.a = newValues.temperature;
  iSensor[0] = (uint8_t) t.b[0];
  iSensor[1] = (uint8_t) t.b[1];
  iSensor[2] = (uint8_t) t.b[2];
  iSensor[3] = (uint8_t) t.b[3];
  t.a = newValues.humidity;
  iSensor[4] = (uint8_t) t.b[0];
  iSensor[5] = (uint8_t) t.b[1];
  iSensor[6] = (uint8_t) t.b[2];
  iSensor[7] = (uint8_t) t.b[3];
  Serial.print(" T:" + String(newValues.temperature) + " H:" + String(newValues.humidity) );
}

uint16_t lux = LightSensor.GetLightIntensity();// Get Lux value
iSensor[8] = (uint8_t) (lux & 0xFF );
iSensor[9] = (uint8_t) (lux>>8 & 0xFF );

uint16_t soilHumidity = analogRead(sensorPin);
iSensor[10] = (uint8_t) (soilHumidity & 0xFF );  
iSensor[11] = (uint8_t) (soilHumidity>>8 & 0xFF );
```

