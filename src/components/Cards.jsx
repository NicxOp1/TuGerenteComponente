import React, { useState,useEffect } from 'react'
import Swal from "sweetalert2";
import {getFirestore, collection, addDoc} from 'firebase/firestore';
import app1 from '../firebaseConfig'



export default function Cards(props) {
    let {data}=props
    const [empresa,setEmpresa]=useState("")
    const db = getFirestore(app1)
/*     let valorInicial={
        nombre:"",
        razonSocial:"",
        ready:false,
        telefono:"",
        codigo:"",
        nit:""
    } */

    useEffect((e)=>{
        if(empresa.ready==true){
            enviar()
        }
    },[empresa])

    /* funcion de po-pup con carga de datos*/

     const sendObject = () => {
        Swal.fire({
            title: `Crear nueva empresa`,
            text: `empresa`,
            showCancelButton: true,
            confirmButtonText: "Agregar",
            html:
              '<label>Nombre<br><input placeHolder="Nombre" id="nombre" value="Nico" class="swal2-input">  </label>'+
              '<label><br><br>Empresa<br><input placeHolder="Empresa" id="razon social" value="Nico S.A." class="swal2-input">  </label>'+
              '<label><br><br>Nit<br><input type="number" placeHolder="Nit" id="nit" value="124568754" class="swal2-input">  </label>'+
              '<label><br><br>Teléfono <br> <input type="number" placeHolder="Teléfono"id="teléfono" value="59165487954" class="swal2-input">  </label>'+
              '<label><br><br>Código <br> <input  placeHolder="Código"id="código" value="ABC123" class="swal2-input">  </label>',
      
            focusConfirm: false,
          }).then((results) => {
            if (results.isConfirmed) {
              let nombreInput = document.getElementById("nombre");
              let razonSocialInput = document.getElementById("razon social");
              let nitInput = document.getElementById("nit");
              let telefonoInput = document.getElementById("teléfono");
              let codigoInput = document.getElementById("código");
                setEmpresa({
                    nombre:nombreInput.value,
                    razonSocial: razonSocialInput.value,
                    ready:true,
                    nit:parseInt(nitInput.value),
                    telefono:parseInt(telefonoInput.value),
                    codigo:codigoInput.value
                })
            } 
          });
        } 
        /* funcion de enviar datos a la DB */
        const enviar = async(e)=>{    
           console.log("envio")
          try{
              await addDoc(collection(db,"empresa"),{
                  ...empresa
              })
          }catch(error){
              console.log(error)
          }
      }

  return (
    <div className='cardContainer'>
        <button className='sendObject' onClick={sendObject}>Agregar Empresa</button>
        <div className='card'>
             {data.map((e)=>(
            <ul key={e.id} className='dataList'>
                <li><i class='bx bx-fw bx-user-circle'></i>Nombre: {e.nombre}</li>
                <li><i class='bx bx-fw bx-buildings'></i>Empresa: {e.razonSocial}</li>
                <li><i class='bx bx-fw bx-id-card'></i>Nit: {e.nit}</li>
                <li><i class='bx bx-fw bx-phone'></i>Teléfono: +{e.telefono}</li>
                <li><i class='bx bx-fw bx-hash' ></i>Código: {e.codigo}</li>
            </ul>
            ))}    
           
            <div className='footer'>
            <span> {data.length} resultados de <a href="#">{data.length}</a></span>       
            </div>
         </div>
    </div>
  )
}
