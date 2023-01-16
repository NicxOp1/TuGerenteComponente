import React,{useState,useRef,useEffect} from 'react'
import Cards from './Cards'
import {Fade} from 'react-awesome-reveal'
import {getFirestore, collection, query,where,limit,getDocs,orderBy} from 'firebase/firestore';
import app1 from '../firebaseConfig'
const db = getFirestore(app1)


export default function Dropdown() {
    /* variables de estado */
    const [dataToPrint,setDataToPrint]=useState([])
    const [hide,setHide]=useState(true)
    let inputRef = useRef(null)
    let selectRef = useRef(null)
    const [textValue,setTextValue]=useState(null)
    const [selectValue,setSelectValue]=useState(null)
  /* funcion para capturar inputs  */
    let handleSelectChange =(e)=>{
      setSelectValue(selectRef.current.value)
      
    }
    let handleChange = (e)=>{
        e.preventDefault();
        setTextValue(inputRef.current.value)
    }
    console.log(selectValue)
/* funcion para filtrar cuando inicia el componente */
    const filterData=async(e)=>{
      e.preventDefault()
      setHide(false)
        try{
          const a = query(collection(db,"empresa"),where(selectValue,"==",textValue))
            const dataToRender =await getDocs(a)
            const docs = []
            dataToRender.forEach((doc)=>{
                docs.push({id:doc.id,...doc.data()})
            })
            console.log(docs)
            setDataToPrint(docs)
        }catch(error){
            console.log(error)
        }
        
    }

/* Funcion para extraer los primeros 20 */
    const getAllData=async(e)=>{
      e.preventDefault()
      setHide(false)
        try{
          const a = query(collection(db,"empresa"),orderBy("nombre","asc"),limit(20))
            const dataToRender =await getDocs(a)
            const docs = []
            dataToRender.forEach((doc)=>{
              docs.push({id:doc.id,...doc.data()})
            })
            setDataToPrint(docs)
        }catch(error){
            console.log(error)
        }
    }
/* funcion para extraer el resto de informacion */
    const getNextData=async(e)=>{
       try{
            const next = query(collection(db,"empresa"))
            const dataToRenderNext =await getDocs(next)
            const docs = []
            dataToRenderNext.forEach((doc)=>{
                docs.push({id:doc.id,...doc.data()})
            })
            setDataToPrint(docs)
        }catch(error){
            console.log(error)
        }
    }
 /* funcion scrollbar */
    useEffect(() => {   

        window.addEventListener("scroll",()=>{
          const scrollable = document.documentElement.scrollHeight - window.innerHeight;
          const scrolled = window.scrollY
          if(Math.ceil(scrolled)===scrollable){
             getNextData()
             console.log("scroll llego al final")
           }
          });

    }, [])
  return (
    <div className='wrapper-list'>
        <h1>Información de empresas</h1>
        <form className='firstForm'>
          <div className='inputAndSelect'>
            <select className='selectInput' name="Parameters" onChange={handleSelectChange} ref={selectRef} >
             <option value="">Seleccione su parámetro</option>
             <option value="nombre">Nombre</option>
             <option value="razonSocial">Razón Social</option>
             <option value="nit">Nit</option>
             <option value="telefono">Teléfono</option>
             <option value="codigo">Código</option>
            </select>
            <input type="text" className='firstInput' ref={inputRef} onChange={handleChange}          placeholder="Buscar por algún parámetro" />
          </div>
        <div className='btnForm'>
        {textValue?(<button onClick={filterData}>Buscar</button>):(<></>)}
        <button onClick={getAllData}>Ver todo</button>
        </div>
        </form>
        <Fade cascade damping={0.1}>
          {hide?<></>:<Cards  data={dataToPrint}/>}
        </Fade>
    </div>
  )
}
