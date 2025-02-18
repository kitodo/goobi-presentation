===============
Database Tables
===============

This is a reference of all database tables defined by Kitodo.Presentation.

.. tip:: This page is auto-generated. If you would like to edit it, please use doc-comments in the model class, COMMENT fields in ``ext_tables.sql`` if the table does not have one, or TCA labels. Then, you may re-generate the page by running ``composer docs:db`` inside the Kitodo.Presentation base folder.

tx_dlf_actionlog: Action protocol
=================================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    user_id  *integer*
     :description:              *User ID*

   - :field:                    file_name  *string*
     :description:              *Filename*

   - :field:                    count_pages  *integer*
     :description:              *Page count*

   - :field:                    name  *string*
     :description:              *Name*

   - :field:                    label  *string*
     :description:              *Action protocol*




tx_dlf_basket: Basket
=====================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    fe_user_id  *integer*
     :description:              *FE user ID*

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              

   - :field:                    l18n_parent  *integer*
     :description:              

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    label  *string*
     :description:              *Basket*

   - :field:                    session_id  *string*
     :description:              *Session ID*

   - :field:                    doc_ids  *string*
     :description:              *Document ID*




tx_dlf_collections: Collections
===============================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    fe_cruser_id  *integer*
     :description:              *Frontend User*

   - :field:                    fe_admin_lock  *smallint*
     :description:              *Disallow frontend editing?*

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              *Language*

   - :field:                    l18n_parent  *integer*
     :description:              *Transl.Orig*

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    hidden  *smallint*
     :description:              *Hide*

   - :field:                    fe_group  *string*
     :description:              *Access*

   - :field:                    label  *string*
     :description:              *Display Label*

   - :field:                    index_name  *string*
     :description:              *Index Name*

   - :field:                    index_search  *text*
     :description:              *Define (virtual) collection via Solr Query*

   - :field:                    oai_name  *string*
     :description:              *OAI-PMH Mapping*

   - :field:                    description  *text*
     :description:              *Description*

   - :field:                    thumbnail  *string*
     :description:              *Thumbnail*

   - :field:                    priority  *smallint*
     :description:              *Priority*

   - :field:                    documents  *integer*
     :description:              *Documents*

   - :field:                    owner  *integer*
     :description:              *Owner*

   - :field:                    status  *smallint*
     :description:              *Status*




tx_dlf_documents: Documents
===========================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              *Last Modified*

   - :field:                    crdate  *integer*
     :description:              *Created At*

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    hidden  *smallint*
     :description:              *Hide*

   - :field:                    starttime  *integer*
     :description:              *Start*

   - :field:                    endtime  *integer*
     :description:              *Stop*

   - :field:                    fe_group  *string*
     :description:              *Access*

   - :field:                    prod_id  *string*
     :description:              *Production Identifier*

   - :field:                    location  *string*
     :description:              *Location of METS file / IIIF manifest (URI)*

   - :field:                    record_id  *string*
     :description:              *Record Identifier*

   - :field:                    opac_id  *string*
     :description:              *OPAC/Local Identifier*

   - :field:                    union_id  *string*
     :description:              *Union Catalog/Foreign Identifier*

   - :field:                    urn  *string*
     :description:              *Uniform Resource Name (URN)*

   - :field:                    purl  *string*
     :description:              *Persistent Uniform Resource Locator (PURL)*

   - :field:                    title  *text*
     :description:              *Title*

   - :field:                    title_sorting  *text*
     :description:              *Title (Sorting)*

   - :field:                    author  *string*
     :description:              *Author*

   - :field:                    year  *string*
     :description:              *Year of Publication*

   - :field:                    place  *string*
     :description:              *Place of Publication*

   - :field:                    thumbnail  *string*
     :description:              *Thumbnail*

   - :field:                    structure  *integer*
     :description:              *Typ of Document*

   - :field:                    partof  *integer*
     :description:              *Part of ...*

   - :field:                    volume  *string*
     :description:              *Number of Volume*

   - :field:                    volume_sorting  *string*
     :description:              *Number of Volume (Sorting)*

   - :field:                    license  *string*
     :description:              *License*

   - :field:                    terms  *string*
     :description:              *Terms of Use*

   - :field:                    restrictions  *string*
     :description:              *Restrictions on Access*

   - :field:                    out_of_print  *text*
     :description:              *Out Of Print Works*

   - :field:                    rights_info  *text*
     :description:              *Rights Information*

   - :field:                    collections  *integer*
     :description:              *Collections*

   - :field:                    mets_label  *text*
     :description:              *METS @LABEL*

   - :field:                    mets_orderlabel  *text*
     :description:              *METS @ORDERLABEL*

   - :field:                    owner  *integer*
     :description:              *Owner*

   - :field:                    solrcore  *integer*
     :description:              

   - :field:                    status  *smallint*
     :description:              *Status*

   - :field:                    document_format  *string*
     :description:              *METS or IIIF*




tx_dlf_formats: Data Formats
============================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    type  *string*
     :description:              *Format Name (e.g. in METS)*

   - :field:                    root  *string*
     :description:              *Root Element*

   - :field:                    namespace  *string*
     :description:              *Namespace URI*

   - :field:                    class  *string*
     :description:              *Class Name*




tx_dlf_libraries: Libraries
===========================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              *Language*

   - :field:                    l18n_parent  *integer*
     :description:              *Transl.Orig*

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    label  *string*
     :description:              *Name*

   - :field:                    index_name  *string*
     :description:              *Index Name*

   - :field:                    website  *string*
     :description:              *Website*

   - :field:                    contact  *string*
     :description:              *Contact*

   - :field:                    image  *string*
     :description:              *Logo*

   - :field:                    oai_label  *string*
     :description:              *Open Archives Interface (OAI) Label*

   - :field:                    oai_base  *string*
     :description:              *Open Archives Interface (OAI) Base URL*

   - :field:                    opac_label  *string*
     :description:              *Online Public Access Catalog (OPAC) Label*

   - :field:                    opac_base  *string*
     :description:              *Online Public Access Catalog (OPAC) Base URL*

   - :field:                    union_label  *string*
     :description:              *Union Catalog Label*

   - :field:                    union_base  *string*
     :description:              *Union Catalog Base URL*




tx_dlf_mail: Email
==================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sorting  *integer*
     :description:              

   - :field:                    mail  *string*
     :description:              *Address*

   - :field:                    name  *string*
     :description:              *Name*

   - :field:                    label  *string*
     :description:              *Email*




tx_dlf_metadata: Metadata
=========================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              *Language*

   - :field:                    l18n_parent  *integer*
     :description:              *Transl.Orig*

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    hidden  *smallint*
     :description:              *Hide*

   - :field:                    sorting  *integer*
     :description:              

   - :field:                    label  *string*
     :description:              *Display Label*

   - :field:                    index_name  *string*
     :description:              *Index Name*

   - :field:                    format  *integer*
     :description:              *Data Format*

   - :field:                    default_value  *string*
     :description:              *Default Value*

   - :field:                    wrap  *text*
     :description:              *TypoScript-Wrap*

   - :field:                    index_tokenized  *smallint*
     :description:              *Tokenize in Search Index?*

   - :field:                    index_stored  *smallint*
     :description:              *Store in Search Index?*

   - :field:                    index_indexed  *smallint*
     :description:              *Index in Search Index?*

   - :field:                    index_boost  *float*
     :description:              *Field boost*

   - :field:                    is_sortable  *smallint*
     :description:              *Prepare for sorting?*

   - :field:                    is_facet  *smallint*
     :description:              *Prepare for faceting?*

   - :field:                    is_listed  *smallint*
     :description:              *Show in titledata/listview?*

   - :field:                    index_autocomplete  *smallint*
     :description:              *Use for search suggestion?*

   - :field:                    status  *smallint*
     :description:              *Status*




tx_dlf_metadataformat: Metadata Format
======================================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    parent_id  *integer*
     :description:              

   - :field:                    encoded  *integer*
     :description:              *Encoding*

   - :field:                    xpath  *string*
     :description:              *XPath (relative to //dmdSec/mdWrap/xmlData/root and with namespace) or JSONPath (relative to resource JSON object)*

   - :field:                    xpath_sorting  *string*
     :description:              *XPath / JSONPath for sorting (optional)*

   - :field:                    subentries  *integer*
     :description:              

   - :field:                    mandatory  *smallint*
     :description:              *Mandatory field?*




tx_dlf_metadatasubentries: Metadata
===================================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    parent_id  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              

   - :field:                    l18n_parent  *integer*
     :description:              

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    label  *string*
     :description:              *Display Label*

   - :field:                    index_name  *string*
     :description:              *Index Name*

   - :field:                    xpath  *string*
     :description:              *XPath (relative to //dmdSec/mdWrap/xmlData/root and with namespace) or JSONPath (relative to resource JSON object)*

   - :field:                    default_value  *string*
     :description:              *Default Value*

   - :field:                    wrap  *text*
     :description:              *TypoScript-Wrap*




tx_dlf_printer: Printer
=======================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    print  *string*
     :description:              *CLI command(##fileName##)*

   - :field:                    label  *string*
     :description:              *Label*




tx_dlf_relations
================

Pivot table for many-to-many relations between tables. In particular, this is used to match documents and collections by using ident=docs_colls.

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    uid_local  *integer*
     :description:              

   - :field:                    uid_foreign  *integer*
     :description:              

   - :field:                    tablenames  *string*
     :description:              

   - :field:                    sorting  *integer*
     :description:              

   - :field:                    sorting_foreign  *integer*
     :description:              

   - :field:                    ident  *string*
     :description:              An identifier to describe which tables are matched.




tx_dlf_solrcores: Solr Cores
============================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    label  *string*
     :description:              *Display Label*

   - :field:                    index_name  *string*
     :description:              *Solr Core*




tx_dlf_structures: Structures
=============================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              

   - :field:                    crdate  *integer*
     :description:              

   - :field:                    cruser_id  *integer*
     :description:              

   - :field:                    deleted  *smallint*
     :description:              

   - :field:                    sys_language_uid  *integer*
     :description:              *Language*

   - :field:                    l18n_parent  *integer*
     :description:              *Transl.Orig*

   - :field:                    l18n_diffsource  *blob*
     :description:              

   - :field:                    l10n_state  *text*
     :description:              

   - :field:                    hidden  *smallint*
     :description:              *Hide*

   - :field:                    toplevel  *smallint*
     :description:              *Toplevel Unit?*

   - :field:                    label  *string*
     :description:              *Display Label*

   - :field:                    index_name  *string*
     :description:              *Index Name*

   - :field:                    oai_name  *string*
     :description:              *OAI-PMH Mapping*

   - :field:                    thumbnail  *integer*
     :description:              *Get thumbnail from...*

   - :field:                    status  *smallint*
     :description:              *Status*




tx_dlf_tokens: Tokens
=====================

.. t3-field-list-table::
   :header-rows: 1

   - :field:                    Field
     :description:              Description

   - :field:                    **uid**  *integer*
     :description:              

   - :field:                    pid  *integer*
     :description:              

   - :field:                    tstamp  *integer*
     :description:              Timestamp of the token used to determine if it has expired.

   - :field:                    token  *string*
     :description:              

   - :field:                    options  *text*
     :description:              

   - :field:                    ident  *string*
     :description:              




