const express = require('express');;
const app = express();
const PORT = process.env.PORT || 3001;
app.get('/', (req,res) =>{
  re.json({message:'Hello MIDI Server'});
});
app.get('/partitions',(req,res)=>{
  res.json({partitions: ['Melodie 1', 'Rythme 2'] });
});
app.listen(PORT,()=>{
  console.log('Server started on port',PORT);
});
