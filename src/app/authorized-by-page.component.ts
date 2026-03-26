import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-authorized-by-page',
  imports: [RouterLink],
  template: `
    <section class="authorized-page">
      <div class="watermark"></div>
      <div class="card">
        <a class="backButton" routerLink="/" aria-label="Back to SOA">↩</a>
        <div class="cardDate">INTERNSHIP PERIOD: JANUARY 2026 - MAY 2026</div>
        <h1>DWCL IT INTERNS</h1>
        <div class="profiles">
          <div class="profileItem">
            <div class="profilePhotoFrame">
              <img class="profilePhoto" src="/assets/karl.JPG" alt="Karl Sebhastian L. Aringo" />
            </div>
            <div class="profileName">Karl Sebhastian L. Aringo</div>
            <div class="profileRole">(Quality Assurance)</div>
            <div class="profileWork">Analysis • Design • Testing and Integration • Maintenance</div>
          </div>
          <div class="profileItem">
            <div class="profilePhotoFrame">
              <img class="profilePhoto" src="/assets/chris.jpeg" alt="Christian Neil V. Dacillo" />
            </div>
            <div class="profileName">Christian Neil V. Dacillo</div>
            <div class="profileRole">(Programmer)</div>
            <div class="profileWork">Design • Implementation • Maintenance</div>
          </div>
          <div class="profileItem">
            <div class="profilePhotoFrame">
              <img class="profilePhoto" src="/assets/melle.PNG" alt="Emmelle Jon G. Del Prado" />
            </div>
            <div class="profileName">Emmelle Jon G. Del Prado</div>
            <div class="profileRole">(Programmer)</div>
            <div class="profileWork">Design • Implementation • Maintenance</div>
          </div>
          <div class="profileItem">
            <div class="profilePhotoFrame">
              <img class="profilePhoto" src="/assets/kenj.jpg" alt="Kenji M. Del Mundo" />
            </div>
            <div class="profileName">Kenji M. Del Mundo</div>
            <div class="profileRole">(Web Developer)</div>
            <div class="profileWork">Analysis • Design • Implementation • Testing and Integration • Maintenance</div>
          </div>
          <div class="profileItem">
            <div class="profilePhotoFrame">
              <img class="profilePhoto" src="/assets/lester.JPG" alt="Lester Emil P. Mustera" />
            </div>
            <div class="profileName">Lester Emil P. Mustera</div>
            <div class="profileRole">(Web Developer)</div>
            <div class="profileWork">Analysis • Design • Implementation • Testing and Integration • Maintenance</div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .authorized-page{
      position: relative;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #fff;
      padding: 24px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    .watermark{
      position: absolute;
      inset: 0;
      background-image: url('/assets/dwclLOGO.png');
      background-position: center;
      background-repeat: no-repeat;
      background-size: 760px 760px;
      opacity: 0.16;
      pointer-events: none;
    }

    .card{
      position: relative;
      z-index: 1;
      width: min(100%, 780px);
      display: grid;
      justify-items: center;
      gap: 18px;
      background: rgba(255, 255, 255, 0.5);
      border: none;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(17, 71, 182, 0.08);
      padding: 32px 28px;
      box-sizing: border-box;
      text-align: center;
    }

    .cardDate{
      position: absolute;
      top: 14px;
      right: 18px;
      font-size: 10px;
      font-weight: 600;
      color: #222;
      letter-spacing: 0.4px;
    }

    .backButton{
      position: absolute;
      top: 10px;
      left: 14px;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      color: #111;
      text-decoration: none;
      font-size: 24px;
      line-height: 1;
    }

    .backButton:hover{
      background: rgba(0, 0, 0, 0.06);
    }

    .profiles{
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 22px 18px;
    }

    .profileItem{
      display: grid;
      justify-items: center;
      gap: 6px;
      width: 170px;
    }

    .profilePhotoFrame{
      width: 140px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(0, 0, 0, 0.55);
      box-sizing: border-box;
    }

    .profilePhoto{
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }

    .profileName{
      font-size: 16px;
      font-weight: 600;
      color: #111;
      line-height: 1.3;
    }

    .profileRole{
      font-size: 13px;
      color: #333;
      line-height: 1.2;
    }

    .profileWork{
      font-size: 11px;
      color: #444;
      line-height: 1.35;
    }

    h1{
      margin: 0;
      font-size: 24px;
      color: #111;
    }

    p{
      margin: 0 0 18px;
      color: #333;
    }

  `]
})
export class AuthorizedByPageComponent {}
