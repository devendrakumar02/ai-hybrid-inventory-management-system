import React,{useEffect,useRef} from 'react';
import {BrowserMultiFormatReader} from '@zxing/browser';
export default function BarcodeScanner({onScan}){
 const ref=useRef(null);
 useEffect(()=>{const reader=new BrowserMultiFormatReader();let controls;
 (async()=>{try{const devices=await BrowserMultiFormatReader.listVideoInputDevices();const id=devices[0]?.deviceId;if(id)controls=await reader.decodeFromVideoDevice(id,ref.current,(result)=>{if(result)onScan(result.getText())});}catch(e){console.error(e)}})();
 return()=>{try{controls?.stop()}catch{}}},[onScan]);
 return <video ref={ref} style={{width:'100%',maxWidth:520}} muted playsInline/>;
}
