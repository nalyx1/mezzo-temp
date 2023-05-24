import fs from 'fs';
import axios from 'axios';
// import { convertCsvToXlsx } from '@aternus/csv-to-xlsx';

const DIRECTUS_URL = 'http://localhost:8055';

export class ExportData {
  exceptions;
  constructor(exceptions) {
    this.exceptions = exceptions;
  }

  async exportUsers(request, response, next) {
    try {
      const dt = Math.floor(Date.now() / 1000);

      const url = `${DIRECTUS_URL}/users?fields=first_name,last_name,email,document,phone,balance,company.name,termos&export=csv&limit=-1`;

      const { data } = await axios.get(url);

      const path = `${dt}-users.csv`;

      fs.writeFileSync(path, data);
      response.status(200).download(path);
    } catch (error) {
      const errorMessage = error.message;
      console.log(errorMessage);
      return next(
        new this.exceptions.ServiceUnavailableException(errorMessage)
      );
    }
  }

  async exportTransactions(request, response, next) {
    try {
      const dt = Math.floor(Date.now() / 1000);
      const url = `${DIRECTUS_URL}/items/transactions?fields=status,date_created,value,user.first_name,user.last_name&export=csv&limit=-1`;

      const { data } = await axios.get(url);

      const path = `${dt}-transactions.csv`;

      fs.writeFileSync(path, data);
      response.status(200).download(path);
    } catch (error) {
      const errorMessage = error.message;
      console.log(errorMessage);
      return next(
        new this.exceptions.ServiceUnavailableException(errorMessage)
      );
    }
  }
}
