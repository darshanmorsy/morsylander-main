const express = require('express');
const app= express();
const port= 2000
const morgan = require('morgan')
const cors= require('cors')
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const { parseISO, format } = require('date-fns');
const cron = require('node-cron');


// app.use(cors(corsOptions));
app.use(cors())
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true }))
// Replace <YourMongoDBURI> with your MongoDB connection URI
const uri ='mongodb+srv://morsypropertydealer:morsypropertydealer@cluster0.p6ub5kn.mongodb.net/lander';
// const uri ='mongodb://127.0.0.1/lander';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true, 
});

const db = mongoose.connection;

db.once('open', () => {
  console.log('Connected to MongoDB');
});

db.on('error', (error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Create a Mongoose model for your data
const userDataSchema = new mongoose.Schema({
    uniqueid:String,
    name: String,
  number: String,
  email: String,

},{
  timestamps: true,
});



const UserData = mongoose.model('UserData', userDataSchema);



const transporter = nodemailer.createTransport({
    service: 'gmail', // e.g., 'Gmail' or use your SMTP configuration
    auth: {
        user: 'morsypropertydealer@gmail.com',
        pass: 'mpvhluylntmhxyjh'
    }
  });
  
  cron.schedule('11 23 * * *', async () => {

    const selectedDate = new Date(); // Get today's date

    try {
      
        const filteredData = await UserData.find({
            createdAt: {
                $gte: selectedDate.setHours(0, 0, 0, 0),
                $lt: selectedDate.setHours(23, 59, 59, 999)
            }
        }).select('name number email createdAt uniqueid').lean()
        console.log(filteredData)

        if (filteredData.length === 0) {
            console.log('No data found for today.')
            return
        }

        // Modify the data to include a separate "createdAt" and "createdTime" field in 12-hour format with AM/PM
        const dataWithTime = filteredData.map(item => ({
            ID: item.uniqueid,
            Date: format(item.createdAt, 'dd-MM-yyyy'),
            Time: format(item.createdAt, 'hh:mm:ss a'),
            Name: item.name,
            number: item.number,
            Email: item.email,
        }));
        console.log(filteredData);

        // Create a new worksheet
        const ws = XLSX.utils.json_to_sheet(dataWithTime);

        // Create a new workbook and add the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        // Write the workbook to a buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Define the output file name with today's date
        const fileName = `data_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`;

        // Send email with the Excel file
        await transporter.sendMail({
            from: 'morsypropertydealer@gmail.com',
            to: 'morsypropertydealer@gmail.com',
            subject: 'Excel File Attachment for Today',
            text: `Please find the attached Excel file for today (${format(selectedDate, 'dd-MM-yyyy')}).`,
            attachments: [
                {
                    filename: fileName,
                    content: buffer
                }
            ]
        });

        console.log(`Excel file for today (${format(selectedDate, 'yyyy-MM-dd')}) sent via email.`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
});




app.post('/',async(req,res)=>{
    // console.log(req.body)
    var d=await UserData.find()
    req.body.uniqueid=d.length+1
    // console.log(d,"h",req.body.id)
    console.log(d,"h",req.body)
    var data =await UserData.create(req.body); 
    if(data){
        // res.status(200).json({status:200})
        res.redirect('https://morsypropertydealer.com/');

    }
})


app.get('/',async(req,res)=>{
    var data =await UserData.find();
    // console.log(data)
    // const ws = XLSX.utils.json_to_sheet(data);

    // // Create a new workbook and add the worksheet
    // const wb = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // // Write the workbook to a buffer
    // const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const ws = XLSX.utils.json_to_sheet(data);

// Create a workbook and add the worksheet
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

// Save the workbook to a file
XLSX.writeFile(wb, 'output.xlsx', { bookType: 'xlsx', type: 'buffer' }, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Excel file saved successfully as output.xlsx');
  }
});

    // Set the response headers for downloading
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="output.xlsx"`);

//     // Send the buffer as the response
//     res.send(buffer);
})
app.listen(port,(err)=>{

    if(err){
        console.log(err);
    }else{
        console.log('Server is running on port '+port)
    }

})