import { Component, ViewChild, OnInit } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BluetoothLE, DeviceInfo, OperationResult, DescriptorParams, Device, Characteristic } from '@ionic-native/bluetooth-le/ngx';

const defaultProgress = 50;
enum SpecStatus {
  Appropriate = '적정',
  Shortage = '부족',
  Good = '좋음',
  Bad = '나쁨',
}
const icons = [
  'assets/images/icon-fertility.png',
  'assets/images/icon-temperature.png',
  'assets/images/icon-current.png',
  'assets/images/icon-luminosity.png',
  'assets/images/icon-humidity.png',
  'assets/images/icon-dust.png',
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
  public fertilityStatus = SpecStatus.Appropriate.valueOf();

  public temperature = 0;
  public temperatureProgress = defaultProgress;
  public temperatureStatus = SpecStatus.Appropriate.valueOf();

  public currentStatus = 'Healthy';
  public currentTitle = '';
  public currentProgress = defaultProgress;

  public luminosity = 0;
  public luminosityProgress = defaultProgress;
  public luminosityStatus = SpecStatus.Appropriate.valueOf();

  public humidity = 0;
  public humidityProgress = defaultProgress;
  public humidityStatus = SpecStatus.Appropriate.valueOf();

  public co2 = 0;
  public co2Progress = defaultProgress;
  public co2Status = SpecStatus.Good.valueOf();

  public dust = 0;
  public dustProgress = defaultProgress;
  public dustStatus = SpecStatus.Good.valueOf();

  private slideChange$: Subscription;

  public name = '황금술통선인장';
  public subname = 'Golden Barrel';
  private address: string;

  private device$: Subscription;
  private ops$: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    public bluetoothle: BluetoothLE,
  ) {
    this.randomData();
    this.randInterval = setInterval(() => this.randomData(), 500);
  }

  ngOnInit() {
    this.address = this.activatedRoute.snapshot.paramMap.get('address');
    const addr: any = { address: this.address };
    console.log(`from home page: ${this.address}`);
    this.device$ = this.bluetoothle.connect(addr).subscribe((data: DeviceInfo) => {
      console.log('==========DEVICE DATA=========');
      console.log(data);
      this.bluetoothle
        .discover({ address: this.address, clearCache: true })
        .then((resDiscover: Device) => {
          console.log('==========DISCOVERY DATA=========');
          console.log(resDiscover);
          const serviceUUID = resDiscover.services[0].uuid;
          const characteristicUUID = resDiscover
            .services[0]
            .characteristics
            .filter((c: Characteristic) => c.properties && c.properties.notify)[0] // notify, write
            .uuid;
          console.log(`serviceUUID: ${serviceUUID}`);
          console.log(`characteristicUUID: ${characteristicUUID}`);
          const params: DescriptorParams = {
            address: this.address,
            characteristic: characteristicUUID,
            service: serviceUUID,
          };
          this.ops$ = this.bluetoothle.subscribe(params).subscribe((ops: OperationResult) => {
            console.log('==========Operation Result(2)=========');
            console.log(ops);
            if (ops.value) {
              console.log(this.bluetoothle.stringToBytes(ops.value));
            }
          });
        })
        .catch(e => {
          console.log(e);
        });
    });
  }

  ionViewDidEnter() {
    this.slideChange$ = this.slides.ionSlideDidChange.subscribe(() => {
      this.ionSlideDidChange();
    });
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

  private randomData() {
    this.fertility = Math.round(Math.random() * 100);
    this.fertilityProgress = this.fertility;

    this.temperature = 20 + Math.round(Math.random() * 20);
    this.temperatureProgress = this.temperature;

    this.currentProgress = Math.round(Math.random() * 100);

    this.luminosity = 100 + Math.round(Math.random() * 100);
    this.luminosityProgress = Math.round(100 * (this.luminosity / 200));

    this.humidity = Math.round(Math.random() * 100);
    this.humidityProgress = this.humidity;

    this.co2 = 100 + Math.round(Math.random() * 100);
    this.co2Progress = Math.round(100 * (this.co2 / 200));

    this.dust = 100 + Math.round(Math.random() * 100);
    this.dustProgress = Math.round(100 * (this.dust / 200));
  }
}
