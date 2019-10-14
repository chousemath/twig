import { Component, ViewChild, OnInit, NgZone } from '@angular/core';
import { IonSlides, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {
  BluetoothLE, DeviceInfo, OperationResult, DescriptorParams, Device,
  WriteCharacteristicParams
} from '@ionic-native/bluetooth-le/ngx';
import { Storage } from '@ionic/storage';
import { Buffer } from 'buffer';
import * as _ from 'lodash';

// namespace for plant-related info starts with "twig-plant-"
const keyName = 'twig-plant-name';
const keySubname = 'twig-plant-subname';
// const fertilityLimit = 10000;

const defaultProgress = 50;

enum SoilHumidity {
  // this was an empiricl measurement made by me (left the sensor in air)
  InAir = 3400,
  // this was an empirical measurement made by me (dipped the sensor in a cup of water)
  InWater = 1350,
  Diff = 3400 - 1350,
}

enum SpecStatus {
  Appropriate = '적정',
  Shortage = '부족',
  Good = '좋음',
  Bad = '나쁨',
}

// possible status messages for "luminosity", https://i.imgur.com/g3LEAOI.png
enum SpecLuminosity {
  Low = '부족',
  OK = '적절',
  High = '과다',
}
// value levels corresponding to each status message for "luminosity"
enum LimitLuminosity {
  OK = 100,
  High = 2500,
}
// possible status messages for "temperature", https://i.imgur.com/PSTNwNO.png
enum SpecTemperature {
  Low = '저온',
  OK = '적절',
  High = '고온',
}
// value levels corresponding to each status message for "temperature"
enum LimitTemperature {
  OK = 21,
  High = 26,
}
// possible status messages for "humidity", https://i.imgur.com/rE3tXZn.png
enum SpecHumidity {
  Low = '건조',
  OK = '적절',
  High = '습함',
}
// value levels corresponding to each status message for "humidity"
enum LimitHumidity {
  OK = 65,
  High = 85,
}
// possible status messages for "fertility", https://i.imgur.com/DhVlA0p.png
enum SpecFertility {
  Low = '건조',
  OK = '적절',
  High = '과다',
}
// value levels corresponding to each status message for "fertility"
enum LimitFertility {
  OK = 45,
  High = 80,
}
// a convenience method for converting raw numeric value to status message
const dataToSpec = (limit: any, spec: any, value: number) => {
  if (value < limit.OK.valueOf()) {
    return spec.Low;
  } else if (value < limit.High.valueOf()) {
    return spec.OK;
  }
  return spec.High;
};
// convenience object to get status messages for each specific plant attribute
const dataToSpecMap = {
  fertility: (value: number) => dataToSpec(LimitFertility, SpecFertility, value),
  temperature: (value: number) => dataToSpec(LimitTemperature, SpecTemperature, value),
  luminosity: (value: number) => dataToSpec(LimitLuminosity, SpecLuminosity, value),
  humidity: (value: number) => dataToSpec(LimitHumidity, SpecHumidity, value),
  // dust: (value: number) => dataToSpec(LimitX, SpecX, value),
  // current: (value: number) => dataToSpec(LimitCurrent, SpecX, value),
};

// default icons for the navigator menu
const icons = [
  'assets/images/icon-fertility-on.png',
  'assets/images/icon-temperature-on.png',
  'assets/images/icon-current-on.png',
  'assets/images/icon-luminosity-on.png',
  'assets/images/icon-humidity-on.png',
  'assets/images/icon-dust-on.png',
];
const iconLimit = icons.length;
// helper function to make sure the navigator does not crash the app
const safeIcon = (i: number): string => {
  if (i >= 0 && i < iconLimit) {
    return icons[i];
  }
  return '';
};

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild(IonSlides, { static: false }) slides: IonSlides;

  private writeParams: WriteCharacteristicParams;

  // declare static asset paths here
  public imgLeft = 'assets/images/navigate-left.png';
  public imgRight = 'assets/images/navigate-right.png';
  public imgPencil = 'assets/images/icon-pencil.png';
  public lightOn = false;

  // used in the .html file in the slider
  public slideOpts = {
    initialSlide: 2,
    speed: 400,
  };
  public currentSlide = 2;

  public showIndicatorDot = false;
  public indicatorDot = icons[2];

  // this is the graphical code for the navigator
  public indicator0 = '';
  public indicator1 = '';
  public indicator2 = '';
  public indicator3 = icons[0];
  public indicator4 = icons[1];
  public indicator5 = icons[2];
  public indicator6 = icons[3];
  public indicator7 = icons[4];
  public indicator8 = icons[5];
  public indicator9 = '';
  public indicator10 = '';

  // remove this before going into production
  private randInterval: any;

  // declare default plant attributes here
  public fertility = 0;
  public fertilityProgress = defaultProgress;
  public fertilityStatus = SpecFertility.OK.valueOf();

  public temperature = 0;
  public temperatureProgress = defaultProgress;
  public temperatureStatus = SpecTemperature.OK.valueOf();

  public currentStatus = 'Healthy';
  public currentTitle = '';
  public currentProgress = defaultProgress;

  public luminosity = 0;
  public luminosityProgress = defaultProgress;
  public luminosityStatus = SpecLuminosity.OK.valueOf();

  public humidity = 0;
  public humidityProgress = defaultProgress;
  public humidityStatus = SpecHumidity.OK.valueOf();

  public co2 = 0;
  public co2Progress = defaultProgress;
  public co2Status = SpecStatus.Good.valueOf();

  public dust = 0;
  public dustProgress = defaultProgress;
  public dustStatus = SpecStatus.Good.valueOf();

  private slideChange$: Subscription;

  public name = '';
  public subname = '';
  private address: string;

  private device$: Subscription;
  private ops$: Subscription;
  private skipCount = 0;

  constructor(
    private activatedRoute: ActivatedRoute,
    public bluetoothle: BluetoothLE,
    public alertController: AlertController,
    private storage: Storage,
    private zone: NgZone,
  ) {
  }

  ngOnInit() {
    console.log('Main page loading...');
    // The address/identifier provided by the scan's return object
    this.address = this.activatedRoute.snapshot.paramMap.get('address');
    const addr: any = { address: this.address };
    // if the address is x, that means that this app is just in UI/UX mode (no BLE connection)
    if (addr === 'x') {
      console.log('bluetooth connection has been bypassed');
      this.randomData();
      this.randInterval = setInterval(() => this.randomData(), 1000);
      return;
    }

    // DEVICE DATA
    this.device$ = this.bluetoothle.connect(addr).subscribe((data: DeviceInfo) => {
      /* Discover all the devices services, characteristics and descriptors.
        clearCache = true / false (default) Force the device to re-discover services,
        instead of relying on cache from previous discovery (Android only)
      */
      console.log('\nDeviceInfo:\n');
      console.log(data);
      this.bluetoothle
        .discover({ address: this.address, clearCache: true })
        .then((resDiscover: Device) => { // DISCOVERY DATA
          const props: Array<any> = _.flatten(resDiscover.services.map(serv => {
            return serv.characteristics.map(ch => {
              return Object.assign(ch.properties, {
                serviceUUID: serv.uuid,
                characteristicUUID: ch.uuid,
              });
            });
          }));
          const readData = props.filter(p => p.notify && p.read)[0];
          const readParams: DescriptorParams = {
            address: this.address,
            characteristic: readData.characteristicUUID,
            service: readData.serviceUUID,
          };
          const writeData = props.filter(p => p.write && p.read)[0];
          this.writeParams = {
            address: this.address,
            characteristic: writeData.characteristicUUID,
            service: writeData.serviceUUID,
            value: '0',
          };
          /* Subscribe to a particular service's characteristic.
             Once a subscription is no longer needed, execute unsubscribe in a similar fashion.
             The Client Configuration descriptor will automatically be written to enable
             notification/indication based on the characteristic's properties.
          */
          this.ops$ = this.bluetoothle.subscribe(readParams).subscribe((ops: OperationResult) => {
            // VALUE: actual data from BLE device (in base64 encoding)
            if (ops.value) {
              this.processData(this.bluetoothle.encodedStringToBytes(ops.value));
            }
          });

          this.writeLightData(0);
        })
        .catch(e => console.log(e));
    });
  }

  // converts base64 data to useable data for the app UI
  private processData(raw: Uint8Array) {
    /* sensor data comes in very quickly
     * there is no need to update the UI for every sensor input
     */
    if (this.skipCount < 5) { // arbitrary update every 5 sensor signals
      this.skipCount++;
      return;
    }
    this.skipCount = 0;

    let ok = 0;
    /* Please reference the Java reference code in the README.md
     * file for why I convert the raw data in this way
     */
    const bufferTemperature = new ArrayBuffer(4);
    const f32Temperature = new Float32Array(bufferTemperature);
    const ui8Temperature = new Uint8Array(bufferTemperature);

    const bufferHumidity = new ArrayBuffer(4);
    const f32Humidity = new Float32Array(bufferHumidity);
    const ui8Humidity = new Uint8Array(bufferHumidity);

    ui8Temperature[0] = raw[0];
    ui8Temperature[1] = raw[1];
    ui8Temperature[2] = raw[2];
    ui8Temperature[3] = raw[3];

    const temperature = Math.round(f32Temperature[0]);
    console.log('temperature:', temperature);
    let temperatureProgress, temperatureStatus;
    if (temperature > LimitTemperature.High.valueOf()) {
      temperatureProgress = 100;
      temperatureStatus = SpecTemperature.High.valueOf();
    } else {
      temperatureStatus = dataToSpecMap.temperature(temperature);
      temperatureProgress = 100 * (temperature / LimitTemperature.High.valueOf());
      if (temperatureStatus === SpecTemperature.OK) { ok++; }
    }

    ui8Humidity[0] = raw[4];
    ui8Humidity[1] = raw[5];
    ui8Humidity[2] = raw[6];
    ui8Humidity[3] = raw[7];

    const humidity = Math.round(f32Humidity[0]);
    console.log('humidity:', humidity);
    let humidityProgress, humidityStatus;
    if (humidity > LimitHumidity.High.valueOf()) {
      humidityProgress = 100;
      humidityStatus = SpecHumidity.High.valueOf();
    } else {
      humidityStatus = dataToSpecMap.humidity(humidity);
      humidityProgress = 100 * (humidity / LimitHumidity.High.valueOf());
      if (humidityStatus === SpecHumidity.OK) { ok++; }
    }

    const bufferLuminosity = Buffer.from([raw[8], raw[9]]);
    const luminosity = bufferLuminosity.readInt16LE(0);
    console.log('luminosity:', luminosity);
    let luminosityProgress, luminosityStatus;
    if (luminosity > LimitLuminosity.High.valueOf()) {
      luminosityProgress = 100;
      luminosityStatus = SpecLuminosity.High.valueOf();
    } else {
      luminosityStatus = dataToSpecMap.luminosity(luminosity);
      luminosityProgress = 100 * (luminosity / LimitLuminosity.High.valueOf());
      if (luminosityStatus === SpecLuminosity.OK) { ok++; }
    }

    const bufferFertility = Buffer.from([raw[10], raw[11]]);
    let fertility = bufferFertility.readInt16LE(0);
    console.log('fertility:', fertility);
    if (SoilHumidity.InWater.valueOf() > fertility) {
      fertility = 100;
    } else if (fertility > SoilHumidity.InAir.valueOf()) {
      fertility = 0;
    } else {
      // fertility = Math.round(100 - (fertility - SoilHumidity.InWater.valueOf()) / (SoilHumidity.Diff.valueOf()));
      fertility = Math.round(100 * (SoilHumidity.InAir.valueOf() - fertility) / SoilHumidity.Diff.valueOf());
    }

    let fertilityStatus;
    if (fertility > LimitFertility.High.valueOf()) {
      fertilityStatus = SpecFertility.High.valueOf();
    } else {
      fertilityStatus = dataToSpecMap.fertility(fertility);
      if (fertilityStatus === SpecFertility.OK) { ok++; }
    }

    // * healthy/ unhealthy 여부
    // 조도,온도,습도,토양습도 -> 총 4가지 중 3가지가 충족할 경우 healthy
    const currentStatus = (ok >= 3) ? 'Healthy' : 'Unhealthy';
    const currentProgress = 25 * ok;

    this.zone.run(() => {
      this.temperature = temperature;
      this.temperatureProgress = temperatureProgress;
      this.temperatureStatus = temperatureStatus.valueOf();

      this.humidity = humidity;
      this.humidityProgress = humidityProgress;
      this.humidityStatus = humidityStatus.valueOf();

      this.luminosity = luminosity;
      this.luminosityProgress = luminosityProgress;
      this.luminosityStatus = luminosityStatus.valueOf();

      this.fertility = fertility;
      this.fertilityProgress = fertility;
      this.fertilityStatus = fertilityStatus.valueOf();

      this.currentStatus = currentStatus;
      this.currentProgress = currentProgress;
    });
  }

  ionViewDidEnter() {
    // event listener for slide change events
    this.slideChange$ = this.slides.ionSlideDidChange.subscribe(() => {
      this.ionSlideDidChange();
    });
  }

  async ionViewWillEnter() {
    // retrieve the stored plant name and subname here
    const nameVal = await this.storage.get(keyName);
    this.name = nameVal ? nameVal : '황금술통선인장';
    const subnameVal = await this.storage.get(keySubname);
    this.subname = subnameVal ? subnameVal : 'Golden Barrel';
  }

  // cleanup all long-lived subscriptions here
  async ionViewWillLeave() {
    clearInterval(this.randInterval);
    if (this.slideChange$) {
      this.slideChange$.unsubscribe();
    }
    if (this.device$) {
      this.device$.unsubscribe();
    }
    const addr = { address: this.address };
    if (await this.bluetoothle.isConnected(addr)) {
      await this.bluetoothle.disconnect(addr);
      await this.bluetoothle.close(addr);
    }
    if (this.ops$) {
      this.ops$.unsubscribe();
    }
  }

  // control slider icon change here
  private async ionSlideDidChange() {
    const i: number = await this.slides.getActiveIndex();
    this.currentSlide = i;
    this.showIndicatorDot = i !== 2;
    /* the slide indicator works simply by swapping
     * the correct images in and out of each slot
     */
    this.indicator0 = safeIcon(i - 5);
    this.indicator1 = safeIcon(i - 4);
    this.indicator2 = safeIcon(i - 3);
    this.indicator3 = safeIcon(i - 2);
    this.indicator4 = safeIcon(i - 1);
    this.indicator5 = safeIcon(i);
    this.indicator6 = safeIcon(i + 1);
    this.indicator7 = safeIcon(i + 2);
    this.indicator8 = safeIcon(i + 3);
    this.indicator9 = safeIcon(i + 4);
    this.indicator10 = safeIcon(i + 5);
  }

  /* just some dumb convenience methods because
   * I hate typing
   */
  public slidePrev() {
    this.slides.slidePrev();
  }
  public slideNext() {
    this.slides.slideNext();
  }

  // control name and subname change popup here
  public async presentAlertPrompt() {
    const alert = await this.alertController.create({
      header: '이름',
      inputs: [
        {
          label: '이름',
          name: 'name',
          type: 'text',
          value: this.name,
          placeholder: '황금술통선인장',
        },
        {
          label: '제목',
          name: 'subname',
          type: 'text',
          value: this.subname,
          placeholder: 'Golden Barrel',
        },
      ],
      buttons: [
        {
          text: '취소',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          },
        }, {
          text: '확인',
          role: 'confirm',
          handler: () => {
            console.log('Confirm Ok');
          },
        }
      ]
    });
    alert.onDidDismiss().then(data => {
      if (data.role === 'confirm') {
        // name data is stored in device local storage
        this.storage.set(keyName, data.data.values.name);
        this.storage.set(keySubname, data.data.values.subname);
        this.zone.run(() => {
          this.name = data.data.values.name;
          this.subname = data.data.values.subname;
        });
      }
    }).catch(e => console.log(e));
    await alert.present();
  }

  // this is just for testing purposes, remove before going into production
  private randomData() {
    this.fertility = Math.round(Math.random() * (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf()));
    this.fertilityProgress = 100 * this.fertility / (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf());
    this.fertilityStatus = dataToSpecMap.fertility(this.fertility).valueOf();

    this.temperature = Math.round(Math.random() * (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf()));
    this.temperatureProgress = 100 * this.temperature / (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf());
    this.temperatureStatus = dataToSpecMap.temperature(this.temperature).valueOf();

    this.currentProgress = Math.round(Math.random() * 100);

    this.luminosity = Math.round(Math.random() * (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf()));
    this.luminosityProgress = 100 * this.luminosity / (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf());
    this.luminosityStatus = dataToSpecMap.luminosity(this.luminosity).valueOf();

    this.humidity = Math.round(Math.random() * (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf()));
    this.humidityProgress = 100 * this.humidity / (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf());
    this.humidityStatus = dataToSpecMap.humidity(this.humidity).valueOf();

    /* An air quality page was included in the original design, but
     * the hardware engineer indicated that there was no such
     * sensors on the smart flowerpot, therefore all air quality
     * related code has been commented out
     */
    // this.co2 = 100 + Math.round(Math.random() * 100);
    // this.co2Progress = Math.round(100 * (this.co2 / 200));
    // this.dust = 100 + Math.round(Math.random() * 100);
    // this.dustProgress = Math.round(100 * (this.dust / 200));
  }

  // bluetooth data write command should go in this function
  toggleLight() {
    /* Note that actually you can give the LED lamp any value between
     * 0 and 255, but there was no clear direction in the app design
     * files on how to handle intermediate values, therefore I assumed
     * that the app designer simply wanted an On/Off switch for the lamp
     */
    if (!this.lightOn) {
      this.writeLightData(255);
    } else {
      this.writeLightData(0);
    }
  }

  private encodeWriteData(uint8: Uint8Array): string {
    return this.bluetoothle.bytesToEncodedString(uint8);
  }

  private writeLightData(val: number) {
    const uint8 = new Uint8Array(2);
    // tslint:disable-next-line:no-bitwise
    uint8[0] = val & 0xFF; // I used the reference conversion code from the hardware engineer here
    // tslint:disable-next-line:no-bitwise
    uint8[1] = val >> 8 & 0xFF;
    this.writeParams.value = this.encodeWriteData(uint8);
    this.bluetoothle.write(this.writeParams).then(res => {
      if (res.status === 'written') {
        this.lightOn = val === 255;
      }
    }).catch(e => console.log('error:', e));
  }
}
