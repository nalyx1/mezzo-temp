import axios from 'axios';
import fs from 'fs';
import { v4 } from 'uuid';

export class MezzoCoin {
  exceptions;
  database;
  constructor(exceptions, database) {
    this.exceptions = exceptions;
    this.database = database;
  }

  async getUserBalanceAndCompanyId(id) {
    const user = await this.database
      .select('balance', 'company')
      .from('directus_users')
      .where({ id });

    return user[0];
  }

  async insertTransaction(type, value, user_id, manager_id) {
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() - 3);

    await this.database('transactions').insert({
      id: v4(),
      status: type,
      date_created: currentDate,
      user_created: manager_id,
      value,
      user: user_id
    });

    return currentDate;
  }

  async updateUserBalance(id, value) {
    await this.database('directus_users')
      .where({ id })
      .update({ balance: value });
  }

  async getCompanyCashbackValue(id) {
    const company = await this.database
      .select('cashback')
      .from('companies')
      .where({ id });

    return company[0];
  }

  async deposit(request, response, next) {
    try {
      const { user_id, value } = request.body;
      const user = await this.getUserBalanceAndCompanyId(user_id);
      const company = await this.getCompanyCashbackValue(
        'e04ce290-6d20-47e8-8ea4-8768cf33e51e'
      );
      const cashbackValue = value * company.cashback;
      user.balance += cashbackValue;
      await this.updateUserBalance(user_id, user.balance);
      await this.insertTransaction('deposit', cashbackValue, user_id);
      return response.status(200).json({
        message: `Successful deposit`,
        data: {
          balance: user.balance
        }
      });
    } catch (error) {
      const errorMessage = error.message;
      console.log(errorMessage);
      return next(
        new this.exceptions.ServiceUnavailableException(
          errorMessage.endsWith('ECONNRESET')
            ? 'Internal server error.'
            : errorMessage
        )
      );
    }
  }

  async withdraw(request, response, next) {
    try {
      const { user_id, value } = request.body;
      const user = await this.getUserBalanceAndCompanyId(user_id);
      if (user.balance < value) {
        return next(
          new this.exceptions.InvalidPayloadException(
            'Value cannot be greater than the balance'
          )
        );
      }
      user.balance -= value;
      await this.insertTransaction('withdraw', value, user_id);
      await this.updateUserBalance(user_id, user.balance);
      return response.status(200).json({
        message: `Successful withdrawal`,
        data: {
          balance: user.balance
        }
      });
    } catch (error) {
      console.log(error);
      return next(
        new this.exceptions.ServiceUnavailableException(
          errorMessage.endsWith('ECONNRESET')
            ? 'Internal server error.'
            : errorMessage
        )
      );
    }
  }

  async discount(request, response, next) {
    try {
      const { user_id, value } = request.body;
      const { user: manager } = request;
      const transaction_date = await this.insertTransaction(
        'discount',
        value,
        user_id,
        manager.id
      );
      return response.status(200).json({
        message: `Discount saved successfully`,
        data: {
          transaction_date
        }
      });
    } catch (error) {
      console.log(error);
      return next(
        new this.exceptions.ServiceUnavailableException(
          errorMessage.endsWith('ECONNRESET')
            ? 'Internal server error.'
            : errorMessage
        )
      );
    }
  }

  async inserCompanies(request, response, next) {
    try {
      const companies = [
        'Audaz Global Logística',
        'Abaré',
        'Accenture',
        'Adyen',
        'Alianco',
        'Alya Construtora',
        'Arriba Marketing',
        'Atuali Comércio Exterior',
        'Ball Corporation',
        'BTG Pactual',
        'Bayer SA',
        'Bionexo',
        'Blue3 Investimentos',
        'Boeing',
        'Bradesco',
        'Braúna Investimentos',
        'Buson',
        'Captture Captação',
        'CDT Software',
        'Comerc Energia',
        'Concessionária Tamoios',
        'Contarh Contabilidade',
        'Coral & Roman Assessoria Empresarial',
        'Cortical Vale',
        'Dassault Systèmes',
        'Dataside',
        'Delta Ind Com Imp Exp Ltda',
        'DMCard',
        'EDP',
        'Embraer',
        'Engetec',
        'Ericsson Telecomunicações',
        'FP413 Inteligência Artificial',
        'Ferrari Bregalda Sociedade de Advogados',
        'Freddo',
        'Garlic Ventures',
        'Grupo Meon de Comunicação',
        'Harpy Logística',
        'Hospital de Olhos',
        'HUESKER Brasil',
        'Infraway Engenharia',
        'JBG Logística',
        'Johnson & Johnson',
        'KPMG',
        'M Vituzzo',
        'Maestro Investimentos',
        'Maislaser by Ana Hickmann',
        'SUPERA Ginástica para o Cérebro',
        'mLabs',
        'Nexxus',
        'Novo TempoRH',
        'Pacaembu Construtora',
        'PagSeguro',
        'Papaya Empório e Café',
        'Petrobras',
        'Porto Vale',
        'Potenza',
        'Quero Bolsa',
        'Quero Educação',
        'Jacques Janine Aquarius',
        'Sankhya',
        'Santander',
        'Sercon Construções',
        'Seven Marketing',
        'Soares Picon',
        'Sotreq',
        'Spinosa e Andrade Sociedade de Advogados',
        'Super Importadora',
        'TiliT Group',
        'Record TV Litoral e Vale',
        'Unimed São José Campos',
        'V4 Company - Wendling & Co',
        'Valgroup',
        'Venice Investimentos',
        'Vinac Consórcios',
        'Visio Solution',
        'Web Rocks'
      ];
      const fileData = [];

      await Promise.resolve(
        companies.map(async (company) => {
          const id = v4();
          const splitCompany = company.split(' ');

          fileData.push({
            id,
            name: company,
            password: `${splitCompany[0].toLowerCase()}123`
          });

          await this.database('companies').insert({
            id,
            status: 'active',
            name: company
          });
        })
      );

      fs.writeFileSync(`companies.json`, JSON.stringify(fileData));

      return response.status(200).json({ message: fileData });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ message: 'Failed' });
    }
  }

  async insertUsers(request, response, next) {
    try {
      const URL = `https://gestao.abare.cloud`;
      const URL_MEZZO = `http://localhost:8055`;
      const {
        data: { data }
      } = await axios.get(
        `${URL}/items/leads?fields=id,lead,dt_uso&filter[id_formulario][_eq]=39&limit=-1`
      );

      const nomeEmpresas = [
        {
          id: '1e279579-855a-47cf-96e7-b24ab3f76427',
          name: 'Audaz',
          password: 'audaz123'
        },
        {
          id: 'e0540867-8af7-479d-ac3b-8d3c782382c5',
          name: 'Abare',
          password: 'abare123'
        },
        {
          id: '8984e91b-9ce8-44f6-b47f-adfcc3b13093',
          name: 'Accenture',
          password: 'accenture123'
        },
        {
          id: '518cfd89-7174-48c1-ba1d-c421e6b7a181',
          name: 'Adyen',
          password: 'adyen123'
        },
        {
          id: '63609902-bf6e-4e3c-b486-a6459e4fc6aa',
          name: 'Allianco',
          password: 'alianco123'
        },
        {
          id: '63609902-bf6e-4e3c-b486-a6459e4fc6aa',
          name: 'Alianco',
          password: 'alianco123'
        },
        {
          id: '8812424d-245d-47a9-ab70-05aa23d13b97',
          name: 'Alya',
          password: 'alya123'
        },
        {
          id: 'afd13c73-e7f1-471b-8993-803a875caabb',
          name: 'Arriba',
          password: 'arriba123'
        },
        {
          id: 'afd13c73-e7f1-471b-8993-803a875caabb',
          name: 'Midax',
          password: 'arriba123'
        },
        {
          id: 'afd13c73-e7f1-471b-8993-803a875caabb',
          name: 'Arriba!',
          password: 'arriba123'
        },
        {
          id: '2dffb2eb-549f-4943-9644-721d69cc1feb',
          name: 'Atuali',
          password: 'atuali123'
        },
        {
          id: '5944afc0-07bb-47e5-b943-b647d836170b',
          name: 'Ball',
          password: 'ball123'
        },
        {
          id: 'b9d99cc3-833a-4aae-b401-1fd1395033c9',
          name: 'BTG',
          password: 'btg123'
        },
        {
          id: '4eee20d4-b16a-402f-be45-57cf26b0ed27',
          name: 'Bayer',
          password: 'bayer123'
        },
        {
          id: '1209c43e-d82e-469b-b25f-8e94ddeeb9b9',
          name: 'Bionexo',
          password: 'bionexo123'
        },
        {
          id: 'd2a644f5-2388-46f6-bd1d-a7cb846cc80a',
          name: 'Blue3',
          password: 'blue123'
        },
        {
          id: 'fe6da90a-9a6f-437e-90df-d475a957dfe2',
          name: 'Boeing',
          password: 'boeing123'
        },
        {
          id: 'ded8d48f-3b17-49a7-82aa-f5c180a5e6ac',
          name: 'Bradesco',
          password: 'bradesco123'
        },
        {
          id: 'b3c7a5c9-f5a9-45fd-89fd-b38c68db3b4a',
          name: 'Braúna',
          password: 'brauna123'
        },
        {
          id: 'b3c7a5c9-f5a9-45fd-89fd-b38c68db3b4a',
          name: 'Brauna',
          password: 'brauna123'
        },
        {
          id: '03aaf6b3-e6da-4ea9-80d9-310ecdedaa53',
          name: 'Buson',
          password: 'buson123'
        },
        {
          id: '1c643486-0832-4f7c-820b-d031d0a5f69e',
          name: 'Captture',
          password: 'captture123'
        },
        {
          id: '8371ca63-7c63-4488-95bb-868efcb4fbc2',
          name: 'CDT',
          password: 'cdt123'
        },
        {
          id: '9675e3aa-a19f-4eb8-a0fe-32359e92b96b',
          name: 'Comerc',
          password: 'comerc123'
        },
        {
          id: 'b05de7b8-32b9-49c0-8ed3-5052e29a94f8',
          name: 'Concessionária',
          password: 'concessionária123'
        },
        {
          id: 'b05de7b8-32b9-49c0-8ed3-5052e29a94f8',
          name: 'Concessionaria',
          password: 'concessionária123'
        },
        {
          id: 'b05de7b8-32b9-49c0-8ed3-5052e29a94f8',
          name: 'TAMOIOS',
          password: 'concessionária123'
        },
        {
          id: 'b05de7b8-32b9-49c0-8ed3-5052e29a94f8',
          name: 'TAMOIS',
          password: 'concessionária123'
        },
        {
          id: 'd12bf957-b02e-4b09-bb5e-b181bad0cdb0',
          name: 'Contarh',
          password: 'contarh123'
        },
        {
          id: 'd12bf957-b02e-4b09-bb5e-b181bad0cdb0',
          name: 'LIMA',
          password: 'contarh123'
        },
        {
          id: '53aeb3f9-cbde-4ba3-a169-4f23137a5240',
          name: 'Coral',
          password: 'coral123'
        },
        {
          id: 'cf859059-33de-4394-8f87-0abc9734d804',
          name: 'Cortical',
          password: 'cortical123'
        },
        {
          id: '005c6897-4ba8-4ed5-9c3a-22377ac4184f',
          name: 'Dassault',
          password: 'dassault123'
        },
        {
          id: '51b11b10-d93f-4128-94ea-7ca7331c82de',
          name: 'Dataside',
          password: 'dataside123'
        },
        {
          id: 'bf3f8388-68f1-4027-a111-af44e24d2c73',
          name: 'Delta',
          password: 'delta123'
        },
        {
          id: '753160de-1e99-4416-9e13-3d23f07ca401',
          name: 'DM',
          password: 'dmcard123'
        },
        {
          id: '753160de-1e99-4416-9e13-3d23f07ca401',
          name: 'DMCard',
          password: 'dmcard123'
        },
        {
          id: 'f7bfb9cc-6aa9-460f-b9af-c094f9c1ad2e',
          name: 'EDP',
          password: 'edp123'
        },
        {
          id: 'f5ef3675-2421-496a-b70e-4817f4dfb18b',
          name: 'Embraer',
          password: 'embraer123'
        },
        {
          id: 'ad3a3897-231d-403d-9842-f9ca464c6ac3',
          name: 'Engetec',
          password: 'engetec123'
        },
        {
          id: 'ad3a3897-231d-403d-9842-f9ca464c6ac3',
          name: 'Enegetec',
          password: 'engetec123'
        },
        {
          id: 'ad3a3897-231d-403d-9842-f9ca464c6ac3',
          name: 'Emgetec',
          password: 'engetec123'
        },
        {
          id: 'ad3a3897-231d-403d-9842-f9ca464c6ac3',
          name: 'Engentec',
          password: 'engetec123'
        },
        {
          id: '37439425-9901-475f-aac1-b0714fdc02e4',
          name: 'Ericsson',
          password: 'ericsson123'
        },
        {
          id: 'c05478b9-152a-4619-b780-e531eb659f52',
          name: 'Estou em dia',
          password: 'fp413123'
        },
        {
          id: '8bf25ea9-6434-490c-9622-e459f5feed4b',
          name: 'Ferrari',
          password: 'ferrari123'
        },
        {
          id: '01c8c60f-f6e7-4b9a-8d3c-0db1e0eb8805',
          name: 'Freddo',
          password: 'freddo123'
        },
        {
          id: '9e3d40ee-3084-4de7-8850-0d1c51319ccc',
          name: 'Garlic',
          password: 'garlic123'
        },
        {
          id: 'f06f3880-d216-462b-9ebe-8bfdb25fd408',
          name: 'Meon',
          password: 'grupo123'
        },
        {
          id: '80fe9795-b43b-46ed-bd3c-d6f156718e71',
          name: 'Harpy',
          password: 'harpy123'
        },
        {
          id: '8a930875-4fda-4e7c-9f7f-974ad125e06f',
          name: 'Hospital de Olhos',
          password: 'hospital123'
        },
        {
          id: '207bf80c-cbca-4553-abdc-be838cccc32a',
          name: 'HUESKER',
          password: 'huesker123'
        },
        {
          id: '78107fa0-be4d-4770-8b56-9d70724fc36d',
          name: 'Infraway',
          password: 'infraway123'
        },
        {
          id: '78107fa0-be4d-4770-8b56-9d70724fc36d',
          name: 'INFRAEAY',
          password: 'infraway123'
        },
        {
          id: '393dea2c-a3d6-4a31-833e-9193895ba443',
          name: 'JBG',
          password: 'jbg123'
        },
        {
          id: '3a42fb55-7b9b-4ce5-a410-1efb931603d2',
          name: 'Johnson',
          password: 'johnson123'
        },
        {
          id: '3a42fb55-7b9b-4ce5-a410-1efb931603d2',
          name: 'Johnson&Johnson',
          password: 'johnson123'
        },
        {
          id: '8d52d745-ffe2-4342-9a82-ddfde048691c',
          name: 'KPMG',
          password: 'kpmg123'
        },
        {
          id: '2d36d833-5bba-43f6-9b50-3d36fd3846ea',
          name: 'M Vituzzo',
          password: 'm123'
        },
        {
          id: '367e857d-8cbd-4d05-9f1b-02f068a1b7b3',
          name: 'Maestro',
          password: 'maestro123'
        },
        {
          id: '1436ff27-f76e-4089-9cd5-af12ecc1ca7c',
          name: 'Maislaser',
          password: 'maislaser123'
        },
        {
          id: '0972bc62-9629-4f0e-b891-93ba6f962f7c',
          name: 'SUPERA',
          password: 'supera123'
        },
        {
          id: '5fe791cd-b6a2-4db6-a965-600398aebaf6',
          name: 'mLabs',
          password: 'mlabs123'
        },
        {
          id: '8712c17f-cba7-43fb-81fa-1ede5c9c3712',
          name: 'Nexxus',
          password: 'nexxus123'
        },
        {
          id: '2eac99d2-ecf5-4d2d-b94d-1615773ea994',
          name: 'Novo TempoRH',
          password: 'novo123'
        },
        {
          id: '2eac99d2-ecf5-4d2d-b94d-1615773ea994',
          name: 'Novo Tempo',
          password: 'novo123'
        },
        {
          id: '2eac99d2-ecf5-4d2d-b94d-1615773ea994',
          name: 'Novotemporh',
          password: 'novo123'
        },
        {
          id: 'ccaf2e37-aee2-4ebb-b4a8-451b1aaf51e0',
          name: 'Pacaembu',
          password: 'pacaembu123'
        },
        {
          id: '7bf2bdfb-48a9-4f9b-b69c-0c8d1badccd8',
          name: 'PagSeguro',
          password: 'pagseguro123'
        },
        {
          id: '76ec4ec5-526a-462d-bfd2-7e6729aa2ae6',
          name: 'Papaya',
          password: 'papaya123'
        },
        {
          id: '22f54ec4-2953-4dfa-a174-22838de9943f',
          name: 'Petrobras',
          password: 'petrobras123'
        },
        {
          id: '0d8b23bc-5ffd-4222-a8ed-a54a08d28651',
          name: 'Porto Vale',
          password: 'porto123'
        },
        {
          id: 'bc06c483-9260-4a8c-b6d0-0e0677408ad6',
          name: 'Potenza',
          password: 'potenza123'
        },
        {
          id: '4d997dab-6450-40f6-ad3b-1ae14c242227',
          name: 'Quero Bolsa',
          password: 'quero123'
        },
        {
          id: '5eb3d5ad-e758-44e7-968c-cfc826bbfe01',
          name: 'Quero Educação',
          password: 'quero123'
        },
        {
          id: '5eb3d5ad-e758-44e7-968c-cfc826bbfe01',
          name: 'Quero educacao',
          password: 'quero123'
        },
        {
          id: '237a5177-9d2c-4334-8d11-ae985917a4d6',
          name: 'Jacques',
          password: 'jacques123'
        },
        {
          id: '5ef1bd41-b712-4bb4-bde5-b5a28685f4c6',
          name: 'Sankhya',
          password: 'sankhya123'
        },
        {
          id: '8d9ef1f1-f34c-448b-9330-3361abb9aaf0',
          name: 'Santander',
          password: 'santander123'
        },
        {
          id: '0d7b253e-632b-45a4-a90f-dce01e7bb981',
          name: 'Sercon',
          password: 'sercon123'
        },
        {
          id: 'c69ae28e-ea89-4f75-af4f-e7c7dfc2f133',
          name: 'Seven Marketing',
          password: 'seven123'
        },
        {
          id: 'f90b8023-502b-480c-a3a9-236037c2e73b',
          name: 'Picon',
          password: 'soares123'
        },
        {
          id: '645145cd-75e8-4a0d-a4b3-d29312fef6a6',
          name: 'Sotreq',
          password: 'sotreq123'
        },
        {
          id: '0871df05-0192-4982-923a-b001d9df87a7',
          name: 'Spinosa',
          password: 'spinosa123'
        },
        {
          id: '65edc75b-3b24-4afe-af66-c79dbf9ad926',
          name: 'Super Importadora',
          password: 'super123'
        },
        {
          id: '65edc75b-3b24-4afe-af66-c79dbf9ad926',
          name: 'Impirtadora',
          password: 'super123'
        },
        {
          id: 'd9b75845-b21a-4d30-ab4a-b76c3ef76510',
          name: 'TiliT Group',
          password: 'tilit123'
        },
        {
          id: 'f9220a52-b3c2-4ffc-9f15-7058b30736fd',
          name: 'Record',
          password: 'record123'
        },
        {
          id: '0129996e-89b5-4d55-b0f2-9220ced85628',
          name: 'Unimed',
          password: 'unimed123'
        },
        {
          id: '0129996e-89b5-4d55-b0f2-9220ced85628',
          name: 'UnimedSJC',
          password: 'unimed123'
        },
        {
          id: '889259d8-1baf-41d0-946f-30be8d38bbc9',
          name: 'Wendling',
          password: 'v4123'
        },
        {
          id: '997c2bbd-54cf-4832-8feb-4e4fb2bf19bf',
          name: 'Valgroup',
          password: 'valgroup123'
        },
        {
          id: 'd40e1577-5c51-47df-943f-f2d6fe00bb0b',
          name: 'Venice Investimentos',
          password: 'venice123'
        },
        {
          id: '07b42fe7-4032-4a1f-ba70-d993b4d3802f',
          name: 'Vinac',
          password: 'vinac123'
        },
        {
          id: 'da887e48-69ad-4128-92c0-1680e14e0de7',
          name: 'Visio Solution',
          password: 'visio123'
        },
        {
          id: '88f1cf9a-98e6-485e-9835-87373a289a80',
          name: 'Rocks',
          password: 'web123'
        }
      ];

      const newLeads = [];

      await Promise.all(
        nomeEmpresas.map(async (nomeEmpresa) => {
          await Promise.all(
            data.map(async (lead) => {
              if (
                lead.lead?.empresaNome
                  ?.toUpperCase()
                  ?.includes(nomeEmpresa.name.toUpperCase())
              ) {
                const exists = newLeads.some(
                  (el) =>
                    el.email?.toLowerCase()?.replace(' ', '') ===
                    lead.lead?.email?.toLowerCase()?.replace(' ', '')
                );

                if (!exists) {
                  newLeads.push({ ...lead.lead, empresa_id: nomeEmpresa.id });
                }
              }
            })
          );
        })
      );

      const nonExistsId = [];
      await Promise.all(
        newLeads.map(async (lead) => {
          if (lead.empresa_id?.length <= 0) {
            nonExistsId.push(lead);
          }
        })
      );

      const uniqueArray = newLeads.filter(
        (obj, index, self) =>
          index ===
          self.findIndex(
            (o) =>
              o.email?.toLowerCase()?.replace(' ', '') ===
              obj.email?.toLowerCase()?.replace(' ', '')
          )
      );

      let usosUnicos = [];
      let dt_usoUnicos = [];
      newLeads.forEach((objeto, index) => {
        const usos = objeto.usos;
        const dt_uso = objeto.dt_uso;

        usos?.forEach((uso) => {
          if (!usosUnicos.includes(uso)) {
            usosUnicos.push(uso);
          }
        });

        if (!dt_usoUnicos.includes(dt_uso)) {
          if (!usosUnicos.includes(dt_uso)) {
            dt_usoUnicos.push(dt_uso);
          }
        }
      });

      const duplicatedArray = newLeads.filter(
        (obj, index, self) =>
          index !==
          self.findIndex(
            (o) =>
              o.email?.toLowerCase()?.replace(' ', '') ===
              obj.email?.toLowerCase()?.replace(' ', '')
          )
      );

      let uniqueLead = [];
      data.forEach((lead) => {
        if (lead.lead.email === 'daniel.d.oliveira@accenture.com') {
          uniqueLead.push(lead);
        }
      });

      const dontHaveEmail = [];
      await Promise.all(
        uniqueArray.map(async (lead) => {
          if (!lead.email) {
            dontHaveEmail.push(lead);
          }
        })
      );

      fs.writeFileSync('unique.json', JSON.stringify(uniqueArray));
      fs.writeFileSync('duplicated.json', JSON.stringify(duplicatedArray));

      let postErrors = [];
      let postErrorsTransactions = [];
      let users = [];
      let transactions = [];

      await Promise.all(
        uniqueArray.map(async (lead) => {
          if (lead.email) {
            await new Promise((resolve) => setTimeout(resolve, 200));

            const nome = lead.nome ?? null;
            const palavras = nome?.toLowerCase().split(' ');

            const nomeFormatado = palavras?.map(
              (palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1)
            );

            const id = v4();
            const last_name = nomeFormatado?.slice(1).join(' ');

            try {
              await axios.post(`${URL_MEZZO}/users`, {
                id,
                first_name: nomeFormatado && nomeFormatado[0],
                last_name: last_name && last_name,
                email: lead.email.toLowerCase().replace(' ', ''),
                role: '10cacf12-2e2c-416d-8d52-63baaea8baea',
                status: 'active',
                document: lead.cpf && lead.cpf,
                phone: lead.telefone && lead.telefone,
                balance: 0,
                company: lead.empresa_id && lead.empresa_id
              });

              users.push({
                id,
                first_name: nomeFormatado && nomeFormatado[0],
                last_name: last_name && last_name,
                email: lead.email.toLowerCase().replace(' ', ''),
                role: '10cacf12-2e2c-416d-8d52-63baaea8baea',
                status: 'active',
                document: lead.cpf && lead.cpf,
                phone: lead.telefone && lead.telefone,
                balance: 0,
                company: lead.empresa_id && lead.empresa_id
              });
            } catch (error) {
              const errorMessage =
                error.response?.data?.errors && error.message;
              console.log(errorMessage);
              postErrors.push(errorMessage);
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
            if (lead.usos) {
              await Promise.all(
                lead.usos.map(async (uso) => {
                  try {
                    const dateUso = new Date(uso?.replace(' ', ''));

                    if (dateUso?.toString() !== 'Invalid Date') {
                      await this.database('transactions').insert({
                        id: v4(),
                        status: 'discount',
                        date_created: dateUso,
                        user: id
                      });

                      // console.log('................ USOS ................');
                      // console.log('lead usos', lead.usos);
                      // console.log('user', id);
                      // console.log('formated dateUso', dateUso);
                      // console.log('dateUso', lead.dt_uso);

                      transactions.push({
                        id: v4(),
                        status: 'discount',
                        date_created: dateUso,
                        user: id
                      });
                    }
                  } catch (error) {
                    console.log(error);
                    const errorMessage =
                      error.response?.data?.errors && error.message;
                    console.log(errorMessage);
                    postErrorsTransactions.push(errorMessage);
                  }
                })
              );
            } else {
              try {
                const uso = lead.dt_uso;
                const dateUso = new Date(uso?.replace(' ', ''));

                if (dateUso?.toString() !== 'Invalid Date') {
                  await this.database('transactions').insert({
                    id: v4(),
                    status: 'discount',
                    date_created: dateUso,
                    user: id
                  });

                  // console.log('................ USOS ................');
                  // console.log('lead', lead);
                  // console.log('lead usos', lead.usos);
                  // console.log('user', id);
                  // console.log('formated dateUso', dateUso);
                  // console.log('dateUso', lead.dt_uso);

                  transactions.push({
                    id: v4(),
                    status: 'discount',
                    date_created: dateUso,
                    user: id
                  });
                }
              } catch (error) {
                console.log(error);
                const errorMessage = error.response?.data && error.message;
                console.log(errorMessage);
                postErrorsTransactions.push(errorMessage);
              }
            }
          }
        })
      );

      console.log('data', data.length);
      console.log('new leads', newLeads.length);
      console.log('unique', uniqueArray.length);
      console.log('duplicate', duplicatedArray.length);
      console.log('SEM ID', nonExistsId);
      console.log('USOS UNICO', usosUnicos.length);
      console.log('DT_USO UNICO', dt_usoUnicos.length);
      console.log('transactions', transactions.length);
      console.log('users', users.length);

      return response.status(200).json(transactions);
    } catch (error) {
      console.log(error);
      const errorMessage = error.response?.data?.errors && error.message;
      console.log(errorMessage);
      return response.status(500).json(errorMessage);
    }
  }
}
