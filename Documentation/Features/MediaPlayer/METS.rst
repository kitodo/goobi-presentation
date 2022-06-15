=============
METS Encoding
=============

Chapter Markers
===============

To set chapter markers, use ``<mets:area>`` with type ``TIME``.
Only the begin is used.

.. code-block:: xml

   <mets:div ID="PHYS_0002" ORDER="2" TYPE="track">
     <mets:fptr>
       <mets:area FILEID="FILE_0000_DEFAULT" BEGIN="00:06:04" BETYPE="TIME" />
     </mets:fptr>
   </mets:div>

Fractional timecodes (e.g., ``00:06:04.5``) may be used.

Multiple Sources
================

Multiple alternative sources may be referenced by linking more than one file to a ``<mets:div>``.
They are tried in the order of the ``<mets:fptr>``.

.. code-block:: xml

   <mets:div ID="PHYS_0001" ORDER="1" TYPE="track">
     <mets:fptr>
       <mets:area FILEID="FILE_0000_DEFAULT_MPD" BEGIN="00:00:00" BETYPE="TIME" />
     </mets:fptr>
     <mets:fptr>
       <mets:area FILEID="FILE_0000_DEFAULT_HLS" BEGIN="00:00:00" BETYPE="TIME" />
     </mets:fptr>
     <mets:fptr>
       <mets:area FILEID="FILE_0000_DEFAULT_MP4" BEGIN="00:00:00" BETYPE="TIME" />
     </mets:fptr>
   </mets:div>
