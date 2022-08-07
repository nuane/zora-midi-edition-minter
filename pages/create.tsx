import { MarkdownEditor } from "../components/markdown-editor";
import { useState, useCallback, useMemo } from "react";
import { Box, Button, Heading, Input } from "degen";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { makeSVGCard } from "../components/image-generator";
import { useAccount, useContract, useProvider, useSigner} from "wagmi";
import type {IERC721Drop} from '@zoralabs/nft-drop-contracts/dist/typechain/ZoraNFTCreatorV1';
import { ZORA_CREATOR_CONTRACT_ADDRESS } from "../constants";
import { parseEther } from "ethers/lib/utils";
import ZoraCreatorABI from '@zoralabs/nft-drop-contracts/dist/artifacts/ZoraNFTCreatorV1.sol/ZoraNFTCreatorV1.json'
import { fileURLToPath } from "url";
import { Midi } from '@tonejs/midi'

function getSalesConfig(): IERC721Drop.SalesConfigurationStruct {
  return {
    // 0.1 eth sales price
    publicSalePrice: parseEther('0.1'),
    // Sets 100 purchases per address
    maxSalePurchasePerAddress: 100,
    publicSaleStart: 0,
    // Sets the sale to last a week: 60 seconds -> minute 60 -> mins hour -> 24 hours in a day -> 7 days in a week
    publicSaleEnd: Math.floor(new Date().getTime()/1000) + 7*24*60*60,
    // Disables presale
    presaleStart: 0,
    presaleEnd: 0,
    presaleMerkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  }
}

export default function CreatePage() {
  const [title, setTitle] = useState("My title");
  const [description, setDescription] = useState<String | ArrayBuffer | null>();
  const [publishing, setPublishing] = useState(false);

  const [file, setFile] = useState({name: '', type: '', size: ''});
	const [isFilePicked, setIsFilePicked] = useState(false);
	const [midi, setMidi] = useState<any>();

  //functions for handling file form logic
	const handleClientUpload = (event: any) => {
		setFile(event.target.files[0]);
    setIsFilePicked(true);

    const uploadedFile = event.target.files[0];
    const reader = new FileReader();
    reader.readAsText(uploadedFile);
    
    //encode midi file and set nft parameters
    reader.onload = function() {
      const encodedMidi = Buffer.from(reader.result as any).toString('base64');
     
      setMidi(reader.result);
      setDescription(encodedMidi);
      setTitle(uploadedFile.name);
    };
    reader.onerror = function() {
      console.log('FILE ERROR: ', reader.error);
    };
	};

  // WAGMI (hooks for ethereum)
  const { address, isConnected } = useAccount()
  const signer = useSigner();
  const provider = useProvider();

  // Connects the zora contracts with WAGMI
  const contract = useContract({
    addressOrName: ZORA_CREATOR_CONTRACT_ADDRESS,
    contractInterface: ZoraCreatorABI.abi,
    signerOrProvider: signer.data || provider,
  })

    //todo fix for midi not md
  const upload = useCallback(async () => {
    setPublishing(true);
    const publishRequest = await fetch("/api/publish", {
      method: "post",
      body: JSON.stringify({
        midi,
        title,
        description,
      }),
    });
    const response = await publishRequest.json();

    const imageIPFS = response.imageCID.IpfsHash;
    const contentIPFS = response.essayCID.IpfsHash;

    console.log({imageIPFS, contentIPFS})

    await contract.createEdition(
      title,
      'MIDINFTDOA',
      100, // edition size
      1000, // 10%,
      address!,
      address!,
      getSalesConfig(),
      description,
      `ipfs://${contentIPFS}`,
      `ipfs://${imageIPFS}`
    );

    setPublishing(false);
  }, [midi, title, description, address, signer]);

  return (
    <div>
      {isConnected&& <ConnectButton />}
     
      <Heading>Title Card Config</Heading>
      {/* <img src={svg} /> */}
      <div style={{ maxWidth: "40%" }}>
        <div
          dangerouslySetInnerHTML={{ __html: makeSVGCard(title, description) }}
        />
      </div>
  

      <Heading>Upload MIDI file:</Heading>
      <Box marginBottom="2" />

      {isFilePicked ? (
        <div>
          <p>Filename: {file.name}</p>
          <p>File type: {file.type}</p>
          <p>File size: {file.size} bytes</p>
        </div>
      ) : (
        <input type="file" name="file" onChange={handleClientUpload} accept=".mid" />
      )}
      
      <div>
        <p>{midi}</p>
      </div>

      {isConnected ? (
      <Button disabled={publishing} onClick={upload}>
        {publishing ? "publishing..." : "Publish!"}
      </Button>

      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
