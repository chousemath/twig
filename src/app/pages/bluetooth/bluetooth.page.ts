import { Component, OnInit } from '@angular/core';
import { NavController, Platform, AlertController, LoadingController, ActionSheetController } from '@ionic/angular';
import { BluetoothLE, ScanStatus } from '@ionic-native/bluetooth-le/ngx';
import { Subscription } from 'rxjs';

const deviceName = 'flowerpot';

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
  public async attemptBluetoothPairing() {
    if (!this.clickable) {
      await this.alertBLE();
      return;
    }
    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    const loading = await this.loadingCtrl.create({
      message: 'Scanning for BLE devices',
    });
    await loading.present();
    this.startScan$ = this.bluetoothle.startScan({}).subscribe(async (res: ScanStatus) => {
      if (res.status === 'scanResult') {
        if (res.name.toLowerCase() === deviceName) {
          this.loadingCtrl.dismiss();
          this.navCtrl.navigateRoot(`/home/${res.address}`);
        }
      }
    });
  }

  // this is just for testing purposes, remove before going into production
  public bypass() {
    this.navCtrl.navigateRoot(`/home/x`);
  }

}
