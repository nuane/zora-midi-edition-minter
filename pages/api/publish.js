import { makeSVGCard } from "../../components/image-generator";
import FormData from "form-data";
import { NFTStorage } from 'nft.storage'
import { env } from "process";

function makeHTMLPage(title, essay) {
  return `
  <!DOCTYPE HTML>
  <html>
  <head>
  <title>${title}</title>
  </head>
  <body>
    ${essay}
  </body>
  </html>
  `;
}

async function uploadToPinata(content, contentType) {
  let formData = new FormData();
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  formData.append(
    "pinataMetadata",
    JSON.stringify({ keyvalues: { type: "midi" } })
  );
  
  formData.append("file", Buffer.from(content, 'utf-8'), 'page.html');
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    body: formData,
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT_KEY}`,
    },
  });
  return await response.json();
}
async function uploadToNFTStorage(content, contentType) {
  let formData = new FormData();
  formData.append("nftstorage", JSON.stringify({ cidVersion: 1 }));
  formData.append(
    "nftstorage",
    JSON.stringify({ keyvalues: { type: "midi" } })
  );
  
  formData.append("file", Buffer.from(content, 'utf-8'), 'page.html');
  console.log(formData);
  const response = await fetch("https://api.nft.storage/store", {
    body: formData,
    method: "post",
    headers: {
      Authorization: `Bearer ${process.env.NFT_STORAGE_API_KEY}`,
    },
  });
  return await response.json();
}

// async function getExampleImage() {
//   const imageOriginUrl = "https://user-images.githubusercontent.com/87873179/144324736-3f09a98e-f5aa-4199-a874-13583bf31951.jpg"
//   const r = await fetch(imageOriginUrl)
//   if (!r.ok) {
//     throw new Error(`error fetching image: [${r.statusCode}]: ${r.status}`)
//   }
//   return r.blob()
// }
// async function uploadToNFTStorage(title, description, content) {

//   const svg = makeSVGCard(title, description);
//   // const image = new Blob([svg], {type: 'image/svg+xml'})
//   const nmg = await getExampleImage();
//   console.log('-----------------------');
//   console.log(nmg);
//   const nft = {
//     image: nmg,
//     name: title,
//     description: description,
//     properties: {
//       type: "blog-post",
//       origins: {
//         http: "https://nft.storage/blog/post/2021-11-30-hello-world-nft-storage/",
//         ipfs: "ipfs://bafybeieh4gpvatp32iqaacs6xqxqitla4drrkyyzq6dshqqsilkk3fqmti/blog/post/2021-11-30-hello-world-nft-storage/"
//       },
//       authors: [{ name: "Some Guy" }],
//       content: {
//         "audio/midi": content
//       }
//     }
//   }

//   const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY })
//   const metadata = await client.store(nft)

//   console.log('NFT data stored!')
//   console.log('Metadata URI: ', metadata.url)
// }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send({ message: "Only POST requests allowed" });
    return;
  }

  const { title, description, midi } = JSON.parse(req.body);

  const imageCID = await uploadToNFTStorage(
    makeSVGCard(title, description),
    "image/svg+xml"
  );

  const essayHTML = makeHTMLPage(title, midi);
  const essayCID = await uploadToNFTStorage(essayHTML, "text/html");

  // const nftest = await uploadToNFTStorage(title, description, midi);
  // console.log(nftest);
  console.log(imageCID, essayCID);

  res.status(200).send({imageCID, essayCID});
  // res.status(200).send(meta=nftest);
}
