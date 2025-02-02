<?xml version="1.0" encoding="utf-8"?>
<!--
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
-->
<!--

    XSL transformation to convert OAI-PMH 2.0 responses into XHTML

    By Christopher Gutteridge, University of Southampton

    Edited by Sebastian Meyer, Saxon State and University Library Dresden

-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:oai="http://www.openarchives.org/OAI/2.0/">

<xsl:output method="html" />

<xsl:template name="style">
td.value {
    vertical-align: top;
    padding-left: 1em;
    padding: 3px;
}
td.key {
    background-color: #e0e0ff;
    padding: 3px;
    text-align: right;
    border: 1px solid #c0c0c0;
    white-space: nowrap;
    font-weight: bold;
    vertical-align: top;
}
.dcdata td.key {
    background-color: #ffffe0;
}
body {
    margin: 1em 2em 1em 2em;
}
h1,
h2,
h3 {
    font-family: sans-serif;
    clear: left;
}
h1 {
    padding-bottom: 4px;
    margin-bottom: 0px;
}
h2 {
    margin-bottom: 0.5em;
}
h3 {
    margin-bottom: 0.3em;
    font-size: medium;
}
.link {
    border: 1px outset #88f;
    background-color: #c0c0ff;
    padding: 1px 4px 1px 4px;
    font-size: 80%;
    text-decoration: none;
    font-weight: bold;
    font-family: sans-serif;
    color: black;
}
.link:hover {
    color: red;
}
.link:active {
    color: red;
    border: 1px inset #88f;
    background-color: #a0a0df;
}
.oaiRecord,
.oaiRecordTitle {
    background-color: #f0f0ff;
    border-style: solid;
    border-color: #d0d0d0;
}
h2.oaiRecordTitle {
    background-color: #e0e0ff;
    font-size: medium;
    font-weight: bold;
    padding: 10px;
    border-width: 2px 2px 0px 2px;
    margin: 0px;
}
.oaiRecord {
    margin-bottom: 3em;
    border-width: 2px;
    padding: 10px;
}

.results {
    margin-bottom: 1.5em;
}
ul.quicklinks {
    margin-top: 2px;
    padding: 4px;
    text-align: left;
    border-bottom: 2px solid #ccc;
    border-top: 2px solid #ccc;
    clear: left;
}
ul.quicklinks li {
    font-size: 80%;
    display: inline;
    list-style: none;
    font-family: sans-serif;
}
p.intro {
    font-size: 80%;
}
<xsl:call-template name='xmlstyle' />
</xsl:template>

<xsl:template name="xmlstyle">
.xmlSource {
    font-size: 70%;
    border: solid #c0c0a0 1px;
    background-color: #ffffe0;
    padding: 2em 2em 2em 0em;
}
.xmlBlock {
    padding-left: 2em;
}
.xmlTagName {
    color: #800000;
    font-weight: bold;
}
.xmlAttrName {
    font-weight: bold;
}
.xmlAttrValue {
    color: #0000c0;
}
</xsl:template>

<xsl:variable name='identifier' select="substring-before(concat(substring-after(/oai:OAI-PMH/oai:request,'identifier='),'&amp;'),'&amp;')" />

<xsl:template match="/">
<html>
    <head>
        <title>Kitodo.Presentation: OAI 2.0 Request Results</title>
        <style><xsl:call-template name="style"/></style>
    </head>
    <body>
        <h1>Kitodo.Presentation: OAI 2.0 Request Results</h1>
        <xsl:call-template name="quicklinks"/>
        <p class="intro">You are viewing an HTML version of the XML OAI-PMH response. To see the underlying XML as it appears to any OAI-PMH harvester use your web browser's view source option or disable XSLT processing.<br />
        More information about this XSLT is at the <a href="#moreinfo">bottom of the page</a>.</p>
        <xsl:apply-templates select="/oai:OAI-PMH" />
        <xsl:call-template name="quicklinks"/>
        <h2><a name="moreinfo">About the XSLT</a></h2>
        <p>An XSLT file has converted the <a href="https://www.openarchives.org">OAI-PMH 2.0</a> responses into XHTML in order to make it human-readable in a browser which supports XSLT such as Mozilla Firefox and Microsoft Internet Explorer.<br />
        The original XSLT file was created by <a href="http://www.ecs.soton.ac.uk/people/cjg">Christopher Gutteridge</a> at the University of Southampton as part of the <a href="http://software.eprints.org">GNU EPrints system</a>, and is freely redistributable under the <a href="http://www.gnu.org">GPL</a>.<br />
        It was adapted to <a href="https://kitodo.org/">Kitodo.Presentation</a> by <a href="mailto:sebastian.meyer@slub-dresden.de">Sebastian Meyer</a> at the Saxon State and University Library Dresden.</p>
    </body>
</html>
</xsl:template>

<xsl:template name="quicklinks">
        <ul class="quicklinks">
            <li><a href="?verb=Identify">Identify</a> | </li>
            <li><a href="?verb=ListIdentifiers&amp;metadataPrefix=oai_dc">ListIdentifiers (OAI_DC)</a> | </li>
            <li><a href="?verb=ListIdentifiers&amp;metadataPrefix=mets">ListIdentifiers (METS)</a> | </li>
            <li><a href="?verb=ListIdentifiers&amp;metadataPrefix=epicur">ListIdentifiers (EPICUR)</a> | </li>
            <li><a href="?verb=ListMetadataFormats">ListMetadataFormats</a> | </li>
            <li><a href="?verb=ListRecords&amp;metadataPrefix=oai_dc">ListRecords (OAI_DC)</a> | </li>
            <li><a href="?verb=ListRecords&amp;metadataPrefix=mets">ListRecords (METS)</a> | </li>
            <li><a href="?verb=ListRecords&amp;metadataPrefix=epicur">ListRecords (EPICUR)</a> | </li>
            <li><a href="?verb=ListSets">ListSets</a></li>
        </ul>
</xsl:template>

<xsl:template match="/oai:OAI-PMH">
    <table class="values">
        <tr><td class="key">Datestamp of Response</td>
        <td class="value"><xsl:value-of select="oai:responseDate"/></td></tr>
        <tr><td class="key">Request URL</td>
        <td class="value"><xsl:value-of select="oai:request"/></td></tr>
    </table>
    <xsl:choose>
        <xsl:when test="oai:error">
            <h2>OAI Error</h2>
            <p>The request could not be completed due to the following error.</p>
            <div class="results">
                <xsl:apply-templates select="oai:error"/>
            </div>
        </xsl:when>
        <xsl:otherwise>
            <p>Request was of type <xsl:value-of select="oai:request/@verb"/>.</p>
            <div class="results">
                <xsl:apply-templates select="oai:Identify" />
                <xsl:apply-templates select="oai:GetRecord"/>
                <xsl:apply-templates select="oai:ListRecords"/>
                <xsl:apply-templates select="oai:ListSets"/>
                <xsl:apply-templates select="oai:ListMetadataFormats"/>
                <xsl:apply-templates select="oai:ListIdentifiers"/>
            </div>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<!--
    Error
-->
<xsl:template match="/oai:OAI-PMH/oai:error">
    <table class="values">
        <tr><td class="key">Error Code</td>
        <td class="value"><xsl:value-of select="@code"/></td></tr>
    </table>
    <p class="error"><xsl:value-of select="." /></p>
</xsl:template>

<!--
    Identify
-->
<xsl:template match="/oai:OAI-PMH/oai:Identify">
    <h2>Repository</h2>
    <table class="values">
        <tr><td class="key">Name</td>
        <td class="value"><xsl:value-of select="oai:repositoryName"/></td></tr>
        <tr><td class="key">Base URL</td>
        <td class="value"><xsl:value-of select="oai:baseURL"/></td></tr>
        <tr><td class="key">Protocol Version</td>
        <td class="value"><xsl:value-of select="oai:protocolVersion"/></td></tr>
        <tr><td class="key">Earliest Datestamp</td>
        <td class="value"><xsl:value-of select="oai:earliestDatestamp"/></td></tr>
        <tr><td class="key">Deleted Record Policy</td>
        <td class="value"><xsl:value-of select="oai:deletedRecord"/></td></tr>
        <tr><td class="key">Granularity</td>
        <td class="value"><xsl:value-of select="oai:granularity"/></td></tr>
        <xsl:apply-templates select="oai:adminEmail"/>
    </table>
</xsl:template>

<xsl:template match="/oai:OAI-PMH/oai:Identify/oai:adminEmail">
        <tr><td class="key">Admin Email</td>
        <td class="value"><xsl:value-of select="."/></td></tr>
</xsl:template>

<!--
    GetRecord
-->
<xsl:template match="oai:GetRecord">
    <xsl:apply-templates select="oai:record" />
</xsl:template>

<!--
    ListRecords
-->
<xsl:template match="oai:ListRecords">
    <xsl:apply-templates select="oai:record" />
    <xsl:apply-templates select="oai:resumptionToken" />
</xsl:template>

<!--
    ListIdentifiers
-->
<xsl:template match="oai:ListIdentifiers">
    <xsl:apply-templates select="oai:header" />
    <xsl:apply-templates select="oai:resumptionToken" />
</xsl:template>

<!--
    ListSets
-->
<xsl:template match="oai:ListSets">
    <xsl:apply-templates select="oai:set" />
    <xsl:apply-templates select="oai:resumptionToken" />
</xsl:template>

<!--
    ListMetadataFormats
-->
<xsl:template match="oai:ListMetadataFormats">
    <xsl:choose>
        <xsl:when test="$identifier">
            <p>This is a list of metadata formats available for the record "<xsl:value-of select='$identifier' />". Use these links to view the metadata: <xsl:apply-templates select="oai:metadataFormat/oai:metadataPrefix" /></p>
        </xsl:when>
        <xsl:otherwise>
            <p>This is a list of metadata formats available from this repository.</p>
        </xsl:otherwise>
    </xsl:choose>
    <xsl:apply-templates select="oai:metadataFormat" />
</xsl:template>

<!--
    Set Details
-->
<xsl:template match="oai:set">
    <h2>Set</h2>
    <table class="values">
        <tr><td class="key">Name</td>
        <td class="value"><xsl:value-of select="oai:setName"/></td></tr>
        <xsl:apply-templates select="oai:setSpec" />
    </table>
</xsl:template>

<xsl:template match="oai:setSpec">
    <tr><td class="key">setSpec</td>
    <td class="value"><xsl:value-of select="."/>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListIdentifiers&amp;metadataPrefix=oai_dc&amp;set={.}">Identifiers (OAI_DC)</a>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListIdentifiers&amp;metadataPrefix=mets&amp;set={.}">Identifiers (METS)</a>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListIdentifiers&amp;metadataPrefix=epicur&amp;set={.}">Identifiers (EPICUR)</a>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListRecords&amp;metadataPrefix=oai_dc&amp;set={.}">Records (OAI_DC)</a>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListRecords&amp;metadataPrefix=mets&amp;set={.}">Records (METS)</a>
        <xsl:text> </xsl:text><a class="link" href="?verb=ListRecords&amp;metadataPrefix=epicur&amp;set={.}">Records (EPICUR)</a>
    </td></tr>
</xsl:template>

<!--
    Metadata Format Details
-->
<xsl:template match="oai:metadataFormat">
    <h2>Metadata Format</h2>
    <table class="values">
        <tr><td class="key">Prefix</td>
        <td class="value"><a class="link" href="?verb=ListRecords&amp;metadataPrefix={oai:metadataPrefix}"><xsl:value-of select="oai:metadataPrefix"/></a></td></tr>
        <tr><td class="key">Namespace</td>
        <td class="value"><xsl:value-of select="oai:metadataNamespace"/></td></tr>
        <tr><td class="key">Schema</td>
        <td class="value"><a href="{oai:schema}"><xsl:value-of select="oai:schema"/></a></td></tr>
    </table>
</xsl:template>

<xsl:template match="oai:metadataPrefix">
            <xsl:text> </xsl:text><a class="link" href="?verb=GetRecord&amp;metadataPrefix={.}&amp;identifier={$identifier}"><xsl:value-of select='.' /></a>
</xsl:template>

<!--
    Record Details
-->
<xsl:template match="oai:record">
    <h2 class="oaiRecordTitle">OAI Record: <xsl:value-of select="oai:header/oai:identifier"/></h2>
    <div class="oaiRecord">
        <xsl:apply-templates select="oai:header" />
        <xsl:apply-templates select="oai:metadata" />
    </div>
</xsl:template>

<xsl:template match="oai:header">
    <h3>OAI Record Header</h3>
    <table class="values">
        <tr><td class="key">OAI Identifier</td>
        <td class="value">
            <xsl:value-of select="oai:identifier"/>
            <xsl:text> </xsl:text><a class="link" href="?verb=GetRecord&amp;metadataPrefix=oai_dc&amp;identifier={oai:identifier}">OAI_DC</a>
            <xsl:text> </xsl:text><a class="link" href="?verb=GetRecord&amp;metadataPrefix=mets&amp;identifier={oai:identifier}">METS</a>
            <xsl:text> </xsl:text><a class="link" href="?verb=GetRecord&amp;metadataPrefix=epicur&amp;identifier={oai:identifier}">EPICUR</a>
            <xsl:text> </xsl:text><a class="link" href="?verb=ListMetadataFormats&amp;identifier={oai:identifier}">formats</a>
        </td></tr>
        <tr><td class="key">Datestamp</td>
        <td class="value"><xsl:value-of select="oai:datestamp"/></td></tr>
    <xsl:apply-templates select="oai:setSpec" />
    </table>
    <xsl:if test="@status='deleted'">
        <p>This record has been deleted.</p>
    </xsl:if>
</xsl:template>

<xsl:template match="oai:metadata">
    &#160;
    <div class="metadata">
        <xsl:apply-templates select="*" />
    </div>
</xsl:template>

<!--
    Resumption Token
-->
<xsl:template match="oai:resumptionToken">
    <xsl:if test=". != ''">
        <p>There are more results.</p>
    </xsl:if>
    <table class="values">
        <tr><td class="key">Cursor</td>
        <td class="value"><xsl:value-of select="@cursor"/></td></tr>
        <tr><td class="key">Total Records</td>
        <td class="value"><xsl:value-of select="@completeListSize"/></td></tr>
        <tr><td class="key">Expiration Datestamp</td>
        <td class="value"><xsl:value-of select="@expirationDate"/></td></tr>
        <tr><td class="key">Resumption Token</td>
        <td class="value">
            <xsl:if test=". != ''">
                <a class="link" href="?verb={/oai:OAI-PMH/oai:request/@verb}&amp;resumptionToken={.}">Resume</a>
            </xsl:if>
        </td></tr>
    </table>
</xsl:template>

<!--
    Unknown Metadata
-->
<xsl:template match="oai:metadata/*" priority='-100'>
    <h3>Unknown Metadata Format</h3>
    <div class="xmlSource">
        <xsl:apply-templates select="." mode='xmlMarkup' />
    </div>
</xsl:template>

<!--
    DublinCore Metadata
-->
<xsl:template match="oai_dc:dc" xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" >
    <div class="dcdata">
        <h3>DublinCore Metadata</h3>
        <table class="dcdata">
            <xsl:apply-templates select="*" />
        </table>
    </div>
</xsl:template>

<xsl:template match="dc:title" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Title</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:creator" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Author or Creator</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:subject" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Subject and Keywords</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:description" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Description</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:publisher" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Publisher</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:contributor" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Other Contributor</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:date" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Date</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:type" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Resource Type</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:format" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Format</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:identifier" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Resource Identifier</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:source" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Source</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:language" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Language</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:relation" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Relation</td><td class="value">
    <xsl:choose>
        <xsl:when test='starts-with(.,"http")'>
            <xsl:choose>
                <xsl:when test='string-length(.) &gt; 50'>
                    <a class="link" href="{.}">URL</a>
                    <i> URL not shown as it is very long.</i>
                </xsl:when>
                <xsl:otherwise>
                    <a href="{.}"><xsl:value-of select="."/></a>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="."/>
        </xsl:otherwise>
    </xsl:choose>
</td></tr>
</xsl:template>

<xsl:template match="dc:coverage" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Coverage</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<xsl:template match="dc:rights" xmlns:dc="http://purl.org/dc/elements/1.1/">
<tr><td class="key">Rights Management</td><td class="value"><xsl:value-of select="."/></td></tr></xsl:template>

<!--
    EPICUR Metadata
-->
<xsl:template match="epicur:epicur" xmlns:epicur="urn:nbn:de:1111-2004033116" >
    <div class="dcdata">
        <h3>EPICUR Metadata</h3>
        <table class="dcdata">
            <xsl:apply-templates select="*" />
        </table>
    </div>
</xsl:template>

<xsl:template match="epicur:format" xmlns:epicur="urn:nbn:de:1111-2004033116" >
    <tr><td class="key">Format</td><td class="value"><xsl:value-of select="."/></td></tr>
</xsl:template>

<xsl:template match="epicur:identifier" xmlns:epicur="urn:nbn:de:1111-2004033116" >
    <tr><td class="key">Resource Identifier</td><td class="value"><xsl:value-of select="."/></td></tr>
</xsl:template>

<!--
    XML Pretty Maker
-->
<xsl:template match="node()" mode='xmlMarkup'>
    <div class="xmlBlock">
        &lt;<span class="xmlTagName"><xsl:value-of select='name(.)' /></span><xsl:apply-templates select="@*" mode='xmlMarkup'/>&gt;<xsl:apply-templates select="node()" mode='xmlMarkup' />&lt;/<span class="xmlTagName"><xsl:value-of select='name(.)' /></span>&gt;
    </div>
</xsl:template>

<xsl:template match="text()" mode='xmlMarkup'><span class="xmlText"><xsl:value-of select='.' /></span></xsl:template>

<xsl:template match="@*" mode='xmlMarkup'>
    <xsl:text> </xsl:text><span class="xmlAttrName"><xsl:value-of select='name()' /></span>="<span class="xmlAttrValue"><xsl:value-of select='.' /></span>"
</xsl:template>

</xsl:stylesheet>
