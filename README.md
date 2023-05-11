# PDF-Export

## What it does
PDF-Export is a simple web application that allows a user to create documents for others to sign. The user can draw boxes on their respective document to show where the signers would sign.

## How it was Made
I used React.js to create a simple frontend server. There are two buttons: one allows the user to upload a file. The second allows the user to submit the PDF when they are done drawing the boxes. The backend was created using Flask to handle the data of where the user drew the signature fields.

## Technologies/APIs
PyHanko and Canvas API were used to allow the user to be able to draw on their PDF and then process that in order to add signature fields. DocuSign API was used to create the envelope for the user to create and send to their appropriate signers
