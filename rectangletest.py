# importing cv2 
import cv2 

from pdf2image import convert_from_path
from io import BytesIO
from PIL import Image
import numpy as np
import os

# Start coordinate, here (5, 5)
# represents the top left corner of rectangle
start_point = (-340, -131)
  
# Ending coordinate, here (220, 220)
# represents the bottom right corner of rectangle
end_point = (-320, 8)

# Blue color in BGR
color = (255, 0, 0)
  
# Line thickness of 2 px
thickness = 2

pages = convert_from_path(os.getcwd() + "/Backend/test_doc_PDF_export.pdf")
for page in pages:
    with BytesIO() as f:
        page.save(f, format="jpeg")
        f.seek(0)
        img_page = np.array(Image.open(f))
        # gray = cv2.cvtColor(img_page,cv2.COLOR_BGR2GRAY)
        gray = img_page
        print(gray.shape)
  
        # Using cv2.rectangle() method
        # Draw a rectangle with blue line borders of thickness of 2 px
        image = cv2.rectangle(gray, start_point, end_point, color, thickness)
        
        # Displaying the image 
        print('got here')
        cv2.imshow("img", gray)
        cv2.waitKey(0)
        exit()


