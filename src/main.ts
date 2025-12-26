import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './environments/firebase.config';

initializeApp(firebaseConfig);

import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  registerables
} from 'chart.js';

//REGISTER CHART.JS COMPONENTS
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

Chart.register(...registerables);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
