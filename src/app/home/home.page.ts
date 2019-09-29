import { Component, ViewChild, OnInit } from '@angular/core';
import { IonSlides, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BluetoothLE, DeviceInfo, OperationResult, DescriptorParams, Device, Characteristic } from '@ionic-native/bluetooth-le/ngx';
import { Storage } from '@ionic/storage';

const keyName = 'twig-plant-name';
const keySubname = 'twig-plant-subname';

const defaultProgress = 50;
enum SpecStatus {
  Appropriate = '적정',
  Shortage = '부족',
  Good = '좋음',
  Bad = '나쁨',
}

enum SpecLuminosity {
  Low = '부족',
  OK = '적절',
  High = '과다',
}
enum LimitLuminosity {
  OK = 100,
  High = 2500,
}

enum SpecTemperature {
  Low = '저온',
  OK = '적절',
  High = '고온',
}
enum LimitTemperature {
  OK = 21,
  High = 26,
}

enum SpecHumidity {
  Low = '건조',
  OK = '적절',
  High = '습함',
}
enum LimitHumidity {
  OK = 65,
  High = 85,
}

enum SpecFertility {
  Low = '건조',
  OK = '적절',
  High = '과다',
}
enum LimitFertility {
  OK = 45,
  High = 80,
}

const dataToSpec = (limit: any, spec: any, value: number) => {
  if (value < limit.OK.valueOf()) {
    return spec.Low.valueOf();
  } else if (value < limit.High.valueOf()) {
    return spec.OK.valueOf();
  }
  return spec.High.valueOf();
};

const dataToSpecMap = {
  fertility: (value: number) => dataToSpec(LimitFertility, SpecFertility, value),
  temperature: (value: number) => dataToSpec(LimitTemperature, SpecTemperature, value),
  luminosity: (value: number) => dataToSpec(LimitLuminosity, SpecLuminosity, value),
  humidity: (value: number) => dataToSpec(LimitHumidity, SpecHumidity, value),
  // dust: (value: number) => dataToSpec(LimitX, SpecX, value),
  // current: (value: number) => dataToSpec(LimitCurrent, SpecX, value),
};

const icons = [
  'assets/images/icon-fertility-on.png',
  'assets/images/icon-temperature-on.png',
  'assets/images/icon-current-on.png',
  'assets/images/icon-luminosity-on.png',
  'assets/images/icon-humidity-on.png',
  'assets/images/icon-dust-on.png',
];
const iconLimit = icons.length;
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
  public imgLeft = 'assets/images/navigate-left.png';
  public imgRight = 'assets/images/navigate-right.png';
  public imgPencil = 'assets/images/icon-pencil.png';
  public imgLight = 'assets/images/icon-light.png';
  public lightOn = false;
  public slideOpts = {
    initialSlide: 2,
    speed: 400,
  };

  public showIndicatorDot = false;
  public indicatorDot = icons[2];

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

  private randInterval: any;

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
  ) {
    this.randomData();
    this.randInterval = setInterval(() => this.randomData(), 1000);
  }

  ngOnInit() {
    this.address = this.activatedRoute.snapshot.paramMap.get('address');
    const addr: any = { address: this.address };
    // if the address is x, that means that this app is just in UI/UX mode (no BLE connection)
    if (addr === 'x') {
      console.log('bluetooth connection has been bypassed');
      return;
    }

    // DEVICE DATA
    this.device$ = this.bluetoothle.connect(addr).subscribe((data: DeviceInfo) => {
      this.bluetoothle
        .discover({ address: this.address, clearCache: true })
        .then((resDiscover: Device) => { // DISCOVERY DATA
          const serviceUUID = resDiscover.services[0].uuid;
          const characteristicUUID = resDiscover
            .services[0]
            .characteristics
            .filter((c: Characteristic) => c.properties && c.properties.notify)[0] // notify, write
            .uuid;
          const params: DescriptorParams = {
            address: this.address,
            characteristic: characteristicUUID,
            service: serviceUUID,
          };
          // Operation Result
          this.ops$ = this.bluetoothle.subscribe(params).subscribe((ops: OperationResult) => {
            // VALUE: actual data from BLE device (in base64 encoding)
            if (ops.value) {
              console.log(ops.value);
            }
          });
        })
        .catch(e => console.log(e));
    });
  }

  ionViewDidEnter() {
    this.slideChange$ = this.slides.ionSlideDidChange.subscribe(() => {
      this.ionSlideDidChange();
    });
  }

  async ionViewWillEnter() {
    const nameVal = await this.storage.get(keyName);
    this.name = nameVal ? nameVal : '황금술통선인장';
    const subnameVal = await this.storage.get(keySubname);
    this.subname = subnameVal ? subnameVal : 'Golden Barrel';
  }

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

  private async ionSlideDidChange() {
    const i: number = await this.slides.getActiveIndex();
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
    this.indicator10 = safeIcon(i + 5);
  }

  public slidePrev() {
    this.slides.slidePrev();
  }
  public slideNext() {
    this.slides.slideNext();
  }

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
        this.storage.set(keyName, data.data.values.name);
        this.storage.set(keySubname, data.data.values.subname);
        this.name = data.data.values.name;
        this.subname = data.data.values.subname;
      }
    }).catch(e => console.log(e));
    await alert.present();
  }

  private randomData() {
    this.fertility = Math.round(Math.random() * (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf()));
    this.fertilityProgress = this.fertility / (LimitFertility.High.valueOf() + LimitFertility.OK.valueOf());
    this.fertilityStatus = dataToSpecMap.fertility(this.fertility);

    this.temperature = Math.round(Math.random() * (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf()));
    this.temperatureProgress = this.temperature / (LimitTemperature.High.valueOf() + LimitTemperature.OK.valueOf());
    this.temperatureStatus = dataToSpecMap.temperature(this.temperature);

    this.currentProgress = Math.round(Math.random() * 100);

    this.luminosity = Math.round(Math.random() * (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf()));
    this.luminosityProgress = this.luminosity / (LimitLuminosity.High.valueOf() + LimitLuminosity.OK.valueOf());
    this.luminosityStatus = dataToSpecMap.luminosity(this.luminosity);

    this.humidity = Math.round(Math.random() * (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf()));
    this.humidityProgress = this.humidity / (LimitHumidity.High.valueOf() + LimitHumidity.OK.valueOf());
    this.humidityStatus = dataToSpecMap.humidity(this.humidity);

    this.co2 = 100 + Math.round(Math.random() * 100);
    this.co2Progress = Math.round(100 * (this.co2 / 200));

    this.dust = 100 + Math.round(Math.random() * 100);
    this.dustProgress = Math.round(100 * (this.dust / 200));
  }

  toggleLight() {
    this.lightOn = !this.lightOn;
    if (this.lightOn) {
      this.imgLight = 'assets/images/icon-light-on.png';
    } else {
      this.imgLight = 'assets/images/icon-light.png';
    }
  }
}
