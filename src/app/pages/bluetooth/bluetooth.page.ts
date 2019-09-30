import { Component, OnInit } from '@angular/core';
import { NavController, Platform, AlertController, LoadingController, ActionSheetController } from '@ionic/angular';
import { BluetoothLE, ScanStatus } from '@ionic-native/bluetooth-le/ngx';
import { Subscription } from 'rxjs';

const loadingTime = 10000;

@Component({
  selector: 'app-bluetooth',
  templateUrl: './bluetooth.page.html',
  styleUrls: ['./bluetooth.page.scss'],
})
export class BluetoothPage implements OnInit {
  // declare static asset paths here
  public imgBluetooth = 'assets/images/icon-bluetooth.png';

  private ble$: Subscription;
  private startScan$: Subscription;
  public clickable = false;
  private scanResults: Array<ScanStatus> = [];
  private scanAddresses = {};
  private buttons: Array<any> = [
    // the default cancel button for bluetooth device selector menu
    {
      text: '닫기',
      icon: 'close',
      role: 'cancel',
      handler: () => console.log('Cancel clicked'),
    },
  ];
  private addressMap = {};
  constructor(
    private navCtrl: NavController,
    public bluetoothle: BluetoothLE,
    public plt: Platform,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public actionSheetCtrl: ActionSheetController,
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.plt.ready().then((readySource) => {
      // check to make sure bluetooth is enabled here
      this.ble$ = this.bluetoothle.initialize().subscribe(async (ble) => {
        this.clickable = ble.status.toLowerCase() === 'enabled';
        if (!this.clickable) {
          await this.alertBLE();
        }
      });
    });
  }

  // convenience method for alerting the user that bluetooth is not on
  private async alertBLE() {
    const alert = await this.alertCtrl.create({
      header: 'Bluetooth unavailable',
      subHeader: 'User action required',
      message: 'Please enable bluetooth and try again.',
      buttons: ['OK']
    });
    await alert.present();
  }

  // clean up any long-lived subscriptions here
  async ionViewWillLeave() {
    if (this.ble$) {
      this.ble$.unsubscribe();
    }
    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    if (await this.bluetoothle.isScanning()) {
      await this.bluetoothle.stopScan();
    }
  }

  // attempt bluetooth device scan
  public async tryPairing() {
    if (!this.clickable) {
      await this.alertBLE();
      return;
    }
    this.scanResults = [];
    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    this.startScan$ = this.bluetoothle.startScan({}).subscribe((res: ScanStatus) => {
      if (res.status === 'scanResult' && !this.scanAddresses[res.address]) {
        this.scanResults.push(res);
        this.scanAddresses[res.address] = true;
      }
    });

    const loading = await this.loadingCtrl.create({
      message: 'Scanning for BLE devices',
      // duration: loadingTime,
    });
    await loading.present();

    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    if (await this.bluetoothle.isScanning()) {
      await this.bluetoothle.stopScan();
      this.scanResults = this.scanResults.filter((scanResult: ScanStatus) => {
        return scanResult.name && scanResult.name.toLowerCase().indexOf('uart') > -1;
      });

      const buttons: Array<any> = this.scanResults.map((scanResult: ScanStatus) => {
        return {
          text: scanResult.name,
          address: scanResult.address,
          icon: 'bluetooth',
          handler: () => {
            this.navCtrl.navigateRoot(`/home/${scanResult.address}`);
          }
        };
      });
      buttons.forEach((button) => {
        if (!this.addressMap[button.address]) {
          this.addressMap[button.address] = true;
          this.buttons.push(button);
        }
      });

      if (this.buttons.length > 1) {
        this.loadingCtrl.dismiss();
        const actionSheet = await this.actionSheetCtrl.create({
          header: 'BLE Devices',
          buttons: this.buttons,
        });
        await actionSheet.present();
      }
    }
  }

  // this is just for testing purposes, remove before going into production
  public bypass() {
    this.navCtrl.navigateRoot(`/home/x`);
  }

}
