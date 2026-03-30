import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
} from '@coreui/angular';

@Component({
  selector: 'app-authorized-by-page',
  imports: [
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    BadgeComponent,
    ButtonDirective,
  ],
  template: `
    <section class="authorized-page">
      <div class="watermark"></div>
      <c-card class="card">
        <c-card-header class="cardHeader">
          <a cButton class="backButton" color="light" variant="ghost" routerLink="/" aria-label="Back to SOA">
            Back
          </a>
          <div class="cardHeaderText">
            <p>DWCL IT INTERNS</p>
            <small>Internship Period: January 2026 - May 2026</small>
          </div>
          <c-badge color="info" shape="rounded-pill">CoreUI Profile Board</c-badge>
        </c-card-header>

        <c-card-body class="cardBody">
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
        </c-card-body>
      </c-card>
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
      border: none;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(17, 71, 182, 0.14);
      background: rgba(255, 255, 255, 0.55);
      box-sizing: border-box;
    }

    .cardHeader{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 22px;
      background: linear-gradient(135deg, rgba(8, 61, 110, 0.98), rgba(18, 110, 179, 0.92));
      color: #fff;
    }

    .backButton{
      white-space: nowrap;
    }

    .cardHeaderText{
      flex: 1;
      min-width: 0;
      text-align: center;
    }

    .cardHeaderText p{
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .cardHeaderText small{
      display: block;
      margin-top: 4px;
      color: rgba(255, 255, 255, 0.78);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .cardBody{
      padding: 28px;
      text-align: center;
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

    @media (max-width: 767.98px){
      .cardHeader{
        flex-direction: column;
        align-items: stretch;
      }

      .cardHeaderText{
        text-align: left;
      }
    }

  `]
})
export class AuthorizedByPageComponent {}
