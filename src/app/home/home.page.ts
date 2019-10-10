import { Component, ViewChild, OnInit } from '@angular/core';
import { IonSlides, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
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
const fertilityLimit = 10000;

const defaultProgress = 50;
enum SpecStatus {
  Appropriate = '적정',
  Shortage = '부족',
  Good = '좋음',
  Bad = '나쁨',
}

// possible status messages for "luminosity"
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
// possible status messages for "temperature"
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
// possible status messages for "humidity"
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
// possible status messages for "fertility"
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
    return spec.Low.valueOf();
  } else if (value < limit.High.valueOf()) {
    return spec.OK.valueOf();
  }
  return spec.High.valueOf();
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
  // 'assets/images/icon-dust-on.png',
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
  // public indicator8 = icons[5];
  public indicator8 = '';
  public indicator9 = '';

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

  constructor(
    private activatedRoute: ActivatedRoute,
    public bluetoothle: BluetoothLE,
    public alertController: AlertController,
    private storage: Storage,
    private splashScreen: SplashScreen,
  ) {
    // this.randomData();
    // this.randInterval = setInterval(() => this.randomData(), 1000);
  }

  ngOnInit() {
    // The address/identifier provided by the scan's return object
    this.address = this.activatedRoute.snapshot.paramMap.get('address');
    const addr: any = { address: this.address };
    // if the address is x, that means that this app is just in UI/UX mode (no BLE connection)
    if (addr === 'x') {
      console.log('bluetooth connection has been bypassed');
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
          console.log('\nDevice:\n');
          console.log(resDiscover);

          console.log('getting the props');
          const props: Array<any> = _.flatten(resDiscover.services.map(serv => {
            return serv.characteristics.map(ch => {
              return Object.assign(ch.properties, {
                serviceUUID: serv.uuid,
                characteristicUUID: ch.uuid,
              });
            });
          }));
          console.log(props);

          const readData = props.filter(p => p.notify && p.read)[0];
          console.log('readData:', readData);

          const readParams: DescriptorParams = {
            address: this.address,
            characteristic: readData.characteristicUUID,
            service: readData.serviceUUID,
          };
          console.log('readParams:', readParams);

          const writeData = props.filter(p => p.write && p.read)[0];
          console.log('writeData:', writeData);
          this.writeParams = {
            address: this.address,
            characteristic: writeData.characteristicUUID,
            service: writeData.serviceUUID,
            value: '0',
          };
          console.log('this.writeParams:', this.writeParams);
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

    this.temperature = Math.round(f32Temperature[0]);
    this.temperatureProgress = 100 * this.temperature / (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf());
    this.temperatureStatus = dataToSpecMap.temperature(this.temperature);

    ui8Humidity[0] = raw[4];
    ui8Humidity[1] = raw[5];
    ui8Humidity[2] = raw[6];
    ui8Humidity[3] = raw[7];

    this.humidity = Math.round(f32Humidity[0]);
    this.humidityProgress = this.humidity;
    this.humidityStatus = dataToSpecMap.humidity(this.humidity);

    const bufferLuminosity = Buffer.from([raw[8], raw[9]]);
    this.luminosity = bufferLuminosity.readInt16LE(0);
    this.luminosityProgress = 100 * (this.luminosity / 65535.0);
    this.luminosityStatus = dataToSpecMap.luminosity(this.luminosity);

    const bufferFertility = Buffer.from([raw[10], raw[11]]);
    const fertility = bufferFertility.readInt16LE(0);
    this.fertility = 100 * fertility / fertilityLimit;
    this.fertilityProgress = this.fertility;
    this.fertilityStatus = dataToSpecMap.fertility(this.fertility);
  }

  ionViewDidEnter() {
    console.log('home page has fully loaded');
    this.splashScreen.hide();
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
  }

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
      console.log(data);
      if (data.role === 'confirm') {
        // name data is stored in device local storage
        this.storage.set(keyName, data.data.values.name);
        this.storage.set(keySubname, data.data.values.subname);
        this.name = data.data.values.name;
        this.subname = data.data.values.subname;
      }
    }).catch(e => console.log(e));
    await alert.present();
  }

  // this is just for testing purposes, remove before going into production
  private randomData() {
    this.fertility = Math.round(Math.random() * (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf()));
    this.fertilityProgress = 100 * this.fertility / (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf());
    this.fertilityStatus = dataToSpecMap.fertility(this.fertility);

    this.temperature = Math.round(Math.random() * (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf()));
    this.temperatureProgress = 100 * this.temperature / (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf());
    this.temperatureStatus = dataToSpecMap.temperature(this.temperature);

    this.currentProgress = Math.round(Math.random() * 100);

    this.luminosity = Math.round(Math.random() * (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf()));
    this.luminosityProgress = 100 * this.luminosity / (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf());
    this.luminosityStatus = dataToSpecMap.luminosity(this.luminosity);

    this.humidity = Math.round(Math.random() * (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf()));
    this.humidityProgress = 100 * this.humidity / (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf());
    this.humidityStatus = dataToSpecMap.humidity(this.humidity);

    // this.co2 = 100 + Math.round(Math.random() * 100);
    // this.co2Progress = Math.round(100 * (this.co2 / 200));

    // this.dust = 100 + Math.round(Math.random() * 100);
    // this.dustProgress = Math.round(100 * (this.dust / 200));
  }

  // bluetooth data write command should go in this function
  toggleLight() {
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
    uint8[0] = val & 0xFF;
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
