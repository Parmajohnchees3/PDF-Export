from flask import Flask, jsonify, request
from flask_cors import CORS
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigFieldSpec, append_signature_field
from docusign_esign import EnvelopesApi, EnvelopeDefinition, Document, Signer, CarbonCopy, Recipients, SignHere, Tabs
from docusign_esign.client.api_client import ApiClient
import base64

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# DocuSign create envelope function
def make_envelope(args, pdf_b64):
    envelope_definition = EnvelopeDefinition(
        email_subject="Please sign this document set"
    )
    
    document = Document(
        document_base64=pdf_b64,
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

    sign_here = SignHere(
        anchor_string="**signature_1**",
        anchor_units="pixels",
        anchor_y_offset="10",
        anchor_x_offset="20"
    )

    signer.tabs = Tabs(sign_here_tabs=[sign_here])

    recipients = Recipients(signers=[signer], carbon_copies=[cc])
    envelope_definition.recipients = recipients
    envelope_definition.status = args["status"]

    return envelope_definition

@app.route('/process_rectangles', methods=['POST'])
def handle_rectangles():
    data = request.get_json()
    rectangles = data.get('rectangles')
    
    rectangles_processed = []
    if rectangles:
        for rectangle in rectangles:
            x1, y1, x2, y2 = rectangle
            field_name = f'my_field_name_{x1}_{y1}_{x2}_{y2}' 
            input_pdf = '/Users/johnyoo/Documents/Code Projects/PDF-Export/Backend/Test Doc for PDF Export.pdf'  
            output_pdf = '/Users/johnyoo/Documents/Code Projects/PDF-Export/Backend/Test Doc for PDF Export.pdf'  
            with open(input_pdf, 'rb+') as pdf:
                w = IncrementalPdfFileWriter(pdf)
                append_signature_field(w, SigFieldSpec(sig_field_name=field_name, on_page=0, box=(float(x1), float(y1), float(x2), float(y2))))
                w.write_in_place()
            
            rectangles_processed.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })
        
        # Encode the new PDF to base64
        with open(output_pdf, "rb") as file:
            pdf_bytes = file.read()
        pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")

        # Prepare envelope arguments (Replace with your actual data)
        envelope_args = {
            "signer_email": "signer@example.com",
            "signer_name": "Signer Name",
            "cc_email": "cc@example.com",
            "cc_name": "CC Name",
            "status": "sent",
            "base_path": "https://demo.docusign.net/restapi",
            "access_token": "YOUR_ACCESS_TOKEN",
            "account_id": "YOUR_ACCOUNT_ID"
        }

        # Create the envelope request object
        envelope_definition = make_envelope(envelope_args, pdf_b64)
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
