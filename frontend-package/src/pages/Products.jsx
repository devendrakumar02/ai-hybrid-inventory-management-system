import React,{useEffect,useMemo,useState} from 'react';
import {api} from '../services/api';
import {cacheProducts,getCachedProducts} from '../utils/offline';
import Icon from '../components/Icon';
import ProductImportModal from '../components/ProductImportModal';

const demo=[
 {id:1,barcode:'8901234567890',productName:'Parle-G Biscuits',category:'Biscuits',supplier:'Parle Products',purchasePrice:18,sellingPrice:22,quantity:128,minimumStockLevel:30},
 {id:2,barcode:'8901030891112',productName:'Maggi 2-Minute Noodles',category:'Noodles',supplier:'Nestlé India',purchasePrice:11,sellingPrice:14,quantity:42,minimumStockLevel:50},
 {id:3,barcode:'8901296010018',productName:'Tata Tea Premium',category:'Beverages',supplier:'Tata Consumer',purchasePrice:210,sellingPrice:245,quantity:86,minimumStockLevel:25},
 {id:4,barcode:'8901037003128',productName:'Colgate Toothpaste',category:'Personal Care',supplier:'Colgate-Palmolive',purchasePrice:92,sellingPrice:110,quantity:9,minimumStockLevel:20},
 {id:5,barcode:'8906005180015',productName:'Aashirvaad Atta 5kg',category:'Staples',supplier:'ITC Limited',purchasePrice:245,sellingPrice:285,quantity:67,minimumStockLevel:20},
 {id:6,barcode:'8901138511123',productName:'Surf Excel Matic 1kg',category:'Home Care',supplier:'Hindustan Unilever',purchasePrice:168,sellingPrice:195,quantity:0,minimumStockLevel:15},
 {id:7,barcode:'8901063010104',productName:'Amul Taaza Milk 1L',category:'Dairy',supplier:'Amul',purchasePrice:52,sellingPrice:58,quantity:31,minimumStockLevel:15},
 {id:8,barcode:'8901725181214',productName:'Fortune Sunflower Oil 1L',category:'Oils',supplier:'AWL Agri Business',purchasePrice:126,sellingPrice:145,quantity:74,minimumStockLevel:20}
];
const empty={barcode:'',productName:'',category:'',supplier:'',purchasePrice:'',sellingPrice:'',quantity:'',minimumStockLevel:''};
const status=p=>Number(p.quantity||0)<=0?['Out of Stock','out']:Number(p.quantity||0)<=Number(p.minimumStockLevel||0)?['Low Stock','low']:['In Stock','in'];
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
export default function Products(){
 const [items,setItems]=useState([]),[q,setQ]=useState(''),[cat,setCat]=useState('All'),[filter,setFilter]=useState('All'),[modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(empty),[toast,setToast]=useState(''),[page,setPage]=useState(1),[importModal,setImportModal]=useState(false);
 const size=7;
 const load=async()=>{try{const r=await api.get('/products',{params:q?{q}:undefined});const data=r.data||[];setItems(data);await cacheProducts(data)}catch{const cached=await getCachedProducts();setItems(cached?.length?cached:demo)}};

 const downloadTemplate = async () => {
  try {
   const res = await api.get('/products/import/template', { responseType: 'blob' });
   const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
   const link = document.createElement('a');
   link.href = url;
   link.setAttribute('download', 'products_import_template.csv');
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
  } catch {
   const csv = "barcode,product_name,category,cost_price,selling_price,stock_quantity,minimum_stock_level,supplier,admin_email,manager_email\r\n8901234567890,Parle-G Biscuits,Biscuits,18.00,22.00,128,30,Parle Products,admin@example.com,store-manager@example.com\r\n";
   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.setAttribute('download', 'products_import_template.csv');
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
  }
 };

 useEffect(() => {
  load();
  const scannedBarcode = localStorage.getItem("newProductBarcode");
  if (scannedBarcode) {
    setForm({
      ...empty,
      barcode: scannedBarcode
    });
    setEditing(null);
    setModal(true);
    localStorage.removeItem("newProductBarcode");
  }
}, []);
 const cats=useMemo(()=>['All',...new Set(items.map(x=>x.category).filter(Boolean))],[items]);
 const filtered=useMemo(()=>items.filter(p=>{const s=status(p)[0];const hay=`${p.productName||''} ${p.barcode||''} ${p.supplier||''}`.toLowerCase();return hay.includes(q.toLowerCase())&&(cat==='All'||p.category===cat)&&(filter==='All'||s===filter)}),[items,q,cat,filter]);
 useEffect(()=>setPage(1),[q,cat,filter]);
 const pages=Math.max(1,Math.ceil(filtered.length/size)),shown=filtered.slice((page-1)*size,page*size);
 const stats=[['Total Products',items.length,'purple','products'],['In Stock',items.filter(x=>status(x)[1]==='in').length,'green','check'],['Low Stock',items.filter(x=>status(x)[1]==='low').length,'orange','warning'],['Out of Stock',items.filter(x=>status(x)[1]==='out').length,'red','warning']];
 const openAdd=()=>{setEditing(null);setForm(empty);setModal(true)};
 const openEdit=p=>{setEditing(p);setForm({...empty,...p});setModal(true)};
 const save=async e=>{e.preventDefault();const payload={...form,purchasePrice:Number(form.purchasePrice),sellingPrice:Number(form.sellingPrice),quantity:Number(form.quantity),minimumStockLevel:Number(form.minimumStockLevel)};try{if(editing){await api.put(`/products/${editing.id}`,payload);setToast('Product updated successfully')}else{await api.post('/products',payload);setToast('Product added successfully')}await load()}catch{setItems(xs=>editing?xs.map(x=>x.id===editing.id?{...x,...payload}:x):[{...payload,id:Date.now()},...xs]);setToast(editing?'Product updated locally':'Product saved locally')}setModal(false);setTimeout(()=>setToast(''),3000)};
 const del=async p=>{if(!confirm(`Delete ${p.productName}?`))return;try{await api.delete('/products/'+p.id)}catch{}setItems(xs=>xs.filter(x=>x.id!==p.id));setToast('Product deleted');setTimeout(()=>setToast(''),2500)};
 return <section className="products-page">
  <div className="page-heading">
   <div>
    <div className="breadcrumb">Inventory <Icon name="chevronRight" size={13}/> Products</div>
    <h1>Products</h1>
    <p>Manage your catalog, pricing, stock levels and barcodes.</p>
   </div>
   <div style={{display:'flex',gap:'8px'}}>
    <button className="secondary-button" onClick={downloadTemplate} title="Download CSV Template"><Icon name="download" size={15}/> Template</button>
    <button className="secondary-button" onClick={()=>setImportModal(true)} title="Bulk Import Products from CSV or Excel file"><Icon name="upload" size={15}/> Import Products</button>
    <button className="primary-button" onClick={openAdd}><Icon name="plus" size={16}/> Add Product</button>
   </div>
  </div>
  <div className="stats-grid product-stats">{stats.map(([t,v,c,i])=><div className="stat-card" key={t}><div className={`stat-icon ${c}`}><Icon name={i} size={19}/></div><div className="stat-main"><span>{t}</span><strong>{v}</strong><small>Current catalog status</small></div></div>)}</div>
  <div className="panel product-panel">
   <div className="product-toolbar"><div className="product-search"><Icon name="search" size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search product, barcode or supplier..."/></div><select value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(x=><option key={x}>{x}</option>)}</select><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select><button className="clear-filter" onClick={()=>{setQ('');setCat('All');setFilter('All')}}>Clear</button></div>
   <div className="product-meta"><span><b>{filtered.length}</b> products</span><span>{filtered.length?(page-1)*size+1:0}–{Math.min(page*size,filtered.length)} of {filtered.length}</span></div>
   <div className="table-scroll"><table className="product-table"><thead><tr><th>PRODUCT</th><th>BARCODE</th><th>CATEGORY</th><th>SELLING PRICE</th><th>STOCK</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{shown.map(p=>{const [label,kind]=status(p);return <tr key={p.id}><td><div className="product-cell"><div className="product-avatar">{(p.productName||'P').charAt(0).toUpperCase()}</div><div><b>{p.productName}</b><span>{p.supplier||'No supplier'}</span></div></div></td><td><code>{p.barcode||'—'}</code></td><td><span className="category-pill">{p.category||'Uncategorized'}</span></td><td><b>{money(p.sellingPrice)}</b><span className="sub-value">Buy {money(p.purchasePrice)}</span></td><td><b>{Number(p.quantity||0)}</b><span className="sub-value">Min {Number(p.minimumStockLevel||0)}</span></td><td><span className={`stock-status ${kind}`}><i/> {label}</span></td><td><div className="action-buttons"><button title="Edit" onClick={()=>openEdit(p)}><Icon name="edit" size={14}/></button><button title="Delete" onClick={()=>del(p)}><Icon name="trash" size={14}/></button></div></td></tr>})}{!shown.length&&<tr><td colSpan="7"><div className="empty-products"><Icon name="products" size={28}/><b>No products found</b><span>Try another search or add a new product.</span><button className="primary-button" onClick={openAdd}><Icon name="plus" size={15}/> Add Product</button></div></td></tr>}</tbody></table></div>
   <div className="product-pagination"><button disabled={page===1} onClick={()=>setPage(x=>x-1)}>Previous</button><div>{Array.from({length:pages},(_,i)=><button className={page===i+1?'active':''} onClick={()=>setPage(i+1)} key={i}>{i+1}</button>)}</div><button disabled={page===pages} onClick={()=>setPage(x=>x+1)}>Next</button></div>
  </div>
  {toast&&<div className="product-toast"><span>✓</span>{toast}</div>}
  {modal&&<div className="modal-overlay" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><form className="product-modal" onSubmit={save}><div className="modal-header"><div><h2>{editing?'Edit Product':'Add Product'}</h2><p>{editing?'Update product information.':'Add a new product to your catalog.'}</p></div><button type="button" className="modal-x" onClick={()=>setModal(false)}><Icon name="close" size={17}/></button></div><div className="form-grid">{[['barcode','Barcode','8901234567890','text'],['productName','Product Name','e.g. Parle-G Biscuits','text'],['category','Category','e.g. Biscuits','text'],['supplier','Supplier','e.g. Parle Products','text'],['purchasePrice','Purchase Price','0','number'],['sellingPrice','Selling Price','0','number'],['quantity','Current Quantity','0','number'],['minimumStockLevel','Minimum Stock Level','0','number']].map(([k,l,ph,type])=> <label key={k}><span>{l}</span><input required={['barcode','productName','sellingPrice','quantity','minimumStockLevel'].includes(k)} type={type} min={type==='number'?0:undefined} placeholder={ph} value={form[k]??''} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</div><div className="modal-footer"><button type="button" className="cancel-button" onClick={()=>setModal(false)}>Cancel</button><button className="primary-button" type="submit">{editing?'Save Changes':'Add Product'}</button></div></form></div>}
  <ProductImportModal
    isOpen={importModal}
    onClose={()=>setImportModal(false)}
    onImportSuccess={async (res)=>{
      await load();
      setToast(res?.message || 'Products imported successfully');
      setTimeout(()=>setToast(''), 4000);
    }}
  />
 </section>
}