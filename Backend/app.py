import shutil
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pyhanko.pdf_utils import generic
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from docusign_esign import EnvelopesApi, EnvelopeDefinition, Document, Signer, CarbonCopy, Recipients, SignHere, Tabs
from docusign_esign.client.api_client import ApiClient
import base64
from PyPDF2 import PdfWriter, PdfReader
from PyPDF2.generic import DictionaryObject, NumberObject, ArrayObject, NameObject

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})



# DocuSign create envelope function
def make_envelope(args, sign_here_tabs, pdf_path):
    with open(pdf_path, "rb") as pdf_file:
        pdf_bytes = pdf_file.read()
    pdf_base64 = base64.b64encode(pdf_bytes).decode("ascii")

    envelope_definition = EnvelopeDefinition(
        email_subject="Please sign this document set"
    )
    
    document = Document(
        document_base64=pdf_base64,
        name="Modified PDF",
        file_extension="pdf",
        document_id="1"
    )
    
    envelope_definition.documents = [document]

    signer = Signer(
        email=args["signer_email"],
        name=args["signer_name"],
        recipient_id="1",
        routing_order="1"
    )

    cc = CarbonCopy(
        email=args["cc_email"],
        name=args["cc_name"],
        recipient_id="2",
        routing_order="2"
    )

    # Use sign_here_tabs argument to set the tabs for the signer
    signer.tabs = Tabs(sign_here_tabs=sign_here_tabs)

    recipients = Recipients(signers=[signer], carbon_copies=[cc])
    envelope_definition.recipients = recipients
    envelope_definition.status = args["status"]

    return envelope_definition



@app.route('/process_rectangles', methods = ['POST'])
def handle_rectangles():
    data = request.get_json()
    rectangles = data.get('rectangles')

    rectangles_processed = []
    sign_here_tabs = []
    if rectangles:
        # Assuming standard US Letter size for now, adjust this for your documents
        for rectangle in rectangles:
            # Convert from canvas to PDF coordinates
            x1, y1, x2, y2 = rectangle
            pdf_width = 595.28  # width of A4 in points
            pdf_height = 841.89  # height of A4 in points
            canvas_width = 794  # width of canvas in pixels
            canvas_height = 1123  # height of canvas in pixels
            x1 = x1 * (pdf_width / canvas_width)
            y1 = pdf_height - (y1 * (pdf_height / canvas_height))  # adjust for origin location
            x2 = x2 * (pdf_width / canvas_width)
            y2 = pdf_height - (y2 * (pdf_height / canvas_height))  # adjust for origin location
            
            # Create a SignHere tab (field on the document) for each rectangle
            sign_here = SignHere(
                document_id="1",
                page_number="1",
                x_position=str(max(0, int(x1))),
                y_position=str(max(0, int(y1))),
                scale_value="1",
                optional="false"
            )
            sign_here_tabs.append(sign_here)

            print(f"Processed rectangle with coordinates: {x1}, {y1}, {x2}, {y2}")
            rectangles_processed.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })

        # Prepare envelope arguments (Replace with your actual data)
        envelope_args = {
            "signer_email": "cmj70@duke.edu",
            "signer_name": "Connor Johnson",
            "cc_email": "jsy12@duke.edu",
            "cc_name": "John Yoo",
            "status": "sent",
            "base_path": "https://demo.docusign.net/restapi",
            "access_token": os.getenv('ACC_TOKEN'),
            "account_id": os.getenv('ACC_ID')
        }

        # Create the envelope request object
        envelope_definition = make_envelope(envelope_args, sign_here_tabs, '/Users/johnyoo/Documents/Code Projects/PDF-Export/Backend/TestDoc_PDF_Export.pdf')
        api_client = ApiClient()
        api_client.host = envelope_args["base_path"]
        api_client.set_default_header("Authorization", f"Bearer {envelope_args['access_token']}")

        # Call Envelopes::create API method
        envelopes_api = EnvelopesApi(api_client)
        results = envelopes_api.create_envelope(account_id=envelope_args["account_id"], envelope_definition=envelope_definition)

        envelope_id = results.envelope_id

        response_data = {
            'success': True, 
            "rectangles_processed": rectangles_processed, 
            "envelope_id": envelope_id
        }
    else:
        response_data = {'success': False, 'message': 'No rectangles received.'}
        
    return jsonify(response_data)




if __name__ == '__main__':
    app.run(debug=True)
