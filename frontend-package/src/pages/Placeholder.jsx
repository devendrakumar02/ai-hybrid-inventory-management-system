import React from 'react';
import {useLocation} from 'react-router-dom';
import Icon from '../components/Icon';
const titles={stockTransfer:'Stock Transfer',alerts:'Alerts',users:'Users & Roles',settings:'Settings'};
export default function Placeholder(){
 const {pathname}=useLocation(); const key=pathname.slice(1); const title=titles[key] || key.replaceAll('-',' ');
 return <section className="panel" style={{padding:32,maxWidth:900,margin:'20px auto'}}>
   <div className="stat-icon purple"><Icon name={key==='alerts'?'alerts':key==='users'?'users':key==='settings'?'settings':'transfer'} size={22}/></div>
   <h1 style={{marginTop:18,textTransform:'capitalize'}}>{title}</h1>
   <p style={{color:'#7d8799'}}>This module is connected to the new UI shell and is ready for its functional implementation.</p>
 </section>
}