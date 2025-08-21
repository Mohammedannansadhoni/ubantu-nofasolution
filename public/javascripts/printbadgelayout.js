$(document).ready(function() {
    var eventIdForPrint = $('#eventIdForPrint').val();
    window.open('/event/print-badge-layout/' + eventIdForPrint, '_blank', '');

})