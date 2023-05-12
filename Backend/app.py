import shutil
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

"""
def add_rectangle_annotation(writer, page, rect_coords):
    # Define the annotation dictionary
    annot = DictionaryObject({
        "/Type": NameObject("/Annot"),
        "/Subtype": NameObject("/Square"),
        "/Rect": ArrayObject(rect_coords),
        "/F": NumberObject(4),  # Print the annotation
        "/BS": DictionaryObject({"/W": NumberObject(1)}),  # Border width
        "/C": ArrayObject([0, 0, 0])  # Black color
    })

    # Add the annotation to the page's /Annots array
    if "/Annots" in page:
        page["/Annots"].append(annot)
    else:
        page.update({NameObject("/Annots"): ArrayObject([annot])})

    # Add the page to writer
    writer.add_page(page)
"""

@app.route('/process_rectangles', methods = ['POST'])
def handle_rectangles():
    data = request.get_json()
    rectangles = data.get('rectangles')

    rectangles_processed = []
    if rectangles:
        for rectangle in rectangles:
            x1, y1, x2, y2 = rectangle
            field_name = f'my_field_name_{x1}_{y1}_{x2}_{y2}'  # unique field name for each rectangle
            input_pdf = '/Users/johnyoo/Documents/Code Projects/PDF-Export/Backend/Test Doc for PDF Export.pdf'
            output_pdf = f'/Users/johnyoo/Documents/Code Projects/PDF-Export/Backend/Test Doc for PDF Export_{x1}_{y1}_{x2}_{y2}.pdf'
            with open(input_pdf, 'rb') as r:
                writer = IncrementalPdfFileWriter(r)
                append_signature_field(writer, SigFieldSpec(sig_field_name=field_name, on_page=0, box=(float(x1), float(y1), float(x2), float(y2))))
                with open(output_pdf, 'wb') as w:
                    writer.write(w)

            # shutil.copy(input_pdf, output_pdf)

            # Open the PDF in binary mode for both reading and writing
            #with open(output_pdf, 'rb+') as r:
                #w = IncrementalPdfFileWriter(r)
                #append_signature_field(w, SigFieldSpec(sig_field_name=field_name, on_page=0, box=(float(x1), float(y1), float(x2), float(y2))))
                #r.seek(0)
                #with open(output_pdf, 'wb') as w:
                    #writer.wrtie(w)
                #reader = PdfReader(r)
                #writer = PdfWriter()

                #for page_num in range(len(reader.pages)):
                    #page = reader.pages[page_num]
                    #if page_num == 0:  # Assuming the signature field is on the first page
                       # add_rectangle_annotation(writer, page, [int(float(x1)), int(float(y1)), int(float(x2)), int(float(y2))])

                    #writer.add_page(page)

                # Overwrite the existing PDF with the new PDF containing the annotation
                #r.seek(0)
                #writer.write(r)

            print(f"Processed rectangle with coordinates: {x1}, {y1}, {x2}, {y2}")
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
            "signer_email": "jsy12@duke.edu",
            "signer_name": "John Yoo",
            "cc_email": "connor.m.johnson@duke.edu",
            "cc_name": "Connor Johnson",
            "status": "sent",
            "base_path": "https://demo.docusign.net/restapi",
            "access_token": "eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0.AQoAAAABAAUABwAAfMItG1PbSAgAALzlO15T20gCAH04YxqavgdLlsttykokmC4VAAEAAAAYAAIAAAAFAAAAHQAAAA0AJAAAADkzMWViNWY1LTNiNmYtNGFlMy1hYjA3LWFiYmQ1NTY5ZDU2OSIAJAAAADkzMWViNWY1LTNiNmYtNGFlMy1hYjA3LWFiYmQ1NTY5ZDU2OTAAgLMk8hRT20g3AEKc9NfIqGBFijF6_SdtO3I.N6dCvbWxp8RIWpWJv7LqG47EBnoqHq9KiDXSWpmHiHj7OWu0xp1NoJtdEnGTbk6ydFR7iWP06jA1TRSZBtog3JL3vny778WzAzZwn2IE55TSuXLRtAi3tp_GB5SD5v-Wh2PEqKfgQcE78GWz6uyiwgnUyw81kCxr_m3mXbZi-h9XWIDkUnKgwJqi8d6wOKt_hUQQ0Rrn5bFex0QVt0HUaJzpdTreIbnMaKPsgCLHQCs2C_4QbXmqbiNtX0f4-ODl_uuRMSHyAFygm5Qn-r24jVucKwO-t28kuShKmf4krcIeElDDAN-RjdudcfHxALjArwSoEkEpsaG5IDzycUo0Bw",
            "account_id": "b85f42eb-fc86-496f-a541-bede5d095bd0"
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
