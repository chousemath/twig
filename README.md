```java
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

```javascript
// RAW: '205,204,188,65,205,204,32,66,27,1,243,12'
// ============
// Temperature: 205,204,188,65
// Humidity: 205,204,32,66
// Light Intensity: 27,1
// Soil Humidity: 243,12

// example converting the 4 bytes of temperature into a js number
const buffer = new ArrayBuffer(4);
const f32 = new Float32Array(buffer); // [0]
const ui8 = new Uint8Array(buffer); // [0, 0, 0, 0]
ui8[0]=205; ui8[1]=204; ui8[2]=188; ui8[3]=65;
f32 // Float32Array [ 23.600000381469727 ]
f32[0] // 23.600000381469727
```

```javascript
> const buf = Buffer.from([243,12]);
undefined
> console.log(buf.readInt16BE(0));
-3316
undefined
> console.log(buf.readInt16LE(0));
3315
undefined
> const buf2 = Buffer.from([243,12]);
undefined
> const buf3 = Buffer.from([27,1]);
undefined
> console.log(buf3.readInt16LE(0));
283
undefined
> Soil Humidity: 243,12
```