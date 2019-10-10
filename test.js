const _ = require('lodash');
const resDiscover = { 
   "status":"discovered",
   "services":[ 
      { 
         "characteristics":[ 
            { 
               "descriptors":[ 
                  { 
                     "uuid":"2902"
                  }
               ],
               "properties":{ 
                  "notify":true,
                  "read":true
               },
               "uuid":"BEB5483E-0000-1000-8000-00805F9B34FB"
            },
            { 
               "descriptors":[ 

               ],
               "properties":{ 
                  "write":true,
                  "read":true
               },
               "uuid":"00002A76-0000-1000-8000-00805F9B34FB"
            }
         ],
         "uuid":"0000181C-0000-1000-8000-00805F9B34FB"
      },
      { 
         "characteristics":[ 
            { 
               "descriptors":[ 
                  { 
                     "uuid":"2902"
                  }
               ],
               "properties":{ 
                  "read":true
               },
               "uuid":"00002A29-0000-1000-8000-00805F9B34FB"
            }
         ],
         "uuid":"0000180A-0000-1000-8000-00805F9B34FB"
      }
   ],
   "name":"Flowerpot",
   "address":"FFD1E37E-0A9F-1881-3867-7579D66A34E5"
};

const props = _.flatten(resDiscover.services.map(serv => {
  return serv.characteristics.map(ch => {
    return Object.assign(ch.properties, {
      serviceUUID: serv.uuid,
      characteristicUUID: ch.uuid,
    });
  });
}));

console.log(props);
